using System;
using System.Diagnostics;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace MyPal.Desktop.Services;

/// <summary>
/// Manages the lifecycle of the Node.js backend required by the Avalonia client.
/// </summary>
public sealed class BackendProcessManager : IAsyncDisposable
{
    private readonly string _workingDirectory;
    private readonly string _nodeExecutable;
    private readonly int _port;
    private readonly HttpClient _httpClient;
    private Process? _process;
    private bool _disposed;

    public BackendProcessManager(string workingDirectory, int port, string nodeExecutable = "node")
    {
        _workingDirectory = workingDirectory ?? throw new ArgumentNullException(nameof(workingDirectory));
        _port = port;
        _nodeExecutable = nodeExecutable;
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri($"http://localhost:{port}/"),
            Timeout = TimeSpan.FromSeconds(2)
        };
    }

    public async Task EnsureRunningAsync(CancellationToken cancellationToken = default)
    {
        ThrowIfDisposed();

        if (await IsBackendResponsiveAsync(cancellationToken).ConfigureAwait(false))
        {
            return;
        }

        StartBackendProcess();

        // Poll health endpoint until ready (or timeout).
        var start = DateTime.UtcNow;
        var timeout = TimeSpan.FromSeconds(30);

        while (!cancellationToken.IsCancellationRequested)
        {
            if (await IsBackendResponsiveAsync(cancellationToken).ConfigureAwait(false))
            {
                return;
            }

            if (DateTime.UtcNow - start > timeout)
            {
                throw new InvalidOperationException("Backend failed to start within timeout window.");
            }

            await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken).ConfigureAwait(false);
        }

        cancellationToken.ThrowIfCancellationRequested();
    }

    private void StartBackendProcess()
    {
        if (_process is { HasExited: false })
        {
            return;
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = _nodeExecutable,
            Arguments = "src/server.js",
            WorkingDirectory = _workingDirectory,
            UseShellExecute = false,
            RedirectStandardError = true,
            RedirectStandardOutput = true,
            CreateNoWindow = true
        };

        startInfo.Environment["PORT"] = _port.ToString();

        var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Failed to start backend process.");
        process.EnableRaisingEvents = true;
        process.OutputDataReceived += (_, args) =>
        {
            if (!string.IsNullOrWhiteSpace(args.Data))
            {
                Debug.WriteLine($"[Backend] {args.Data}");
            }
        };
        process.ErrorDataReceived += (_, args) =>
        {
            if (!string.IsNullOrWhiteSpace(args.Data))
            {
                Debug.WriteLine($"[Backend][ERR] {args.Data}");
            }
        };
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        _process = process;
    }

    private async Task<bool> IsBackendResponsiveAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync("api/health", cancellationToken).ConfigureAwait(false);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _httpClient.Dispose();

        if (_process is { HasExited: false })
        {
            try
            {
                _process.Kill(entireProcessTree: true);
                await _process.WaitForExitAsync().ConfigureAwait(false);
            }
            catch
            {
                // Ignore shutdown exceptions.
            }
        }

        _process?.Dispose();
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
        {
            throw new ObjectDisposedException(nameof(BackendProcessManager));
        }
    }
}
