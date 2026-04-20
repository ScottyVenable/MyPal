using System;
using System.Threading;
using System.Threading.Tasks;
using Avalonia.Threading;
using CommunityToolkit.Mvvm.ComponentModel;
using MyPal.Desktop.Models;
using MyPal.Desktop.Services;

namespace MyPal.Desktop.ViewModels;

public partial class MainWindowViewModel : ViewModelBase, IAsyncDisposable
{
    private readonly BackendClient _backendClient;
    private readonly BackendProcessManager _processManager;
    private readonly CancellationTokenSource _lifetimeCts = new();
    private ViewModelBase _currentViewModel;
    private bool _initialized;
    private bool _disposed;

    [ObservableProperty]
    private string? _statusMessage;

    public MainWindowViewModel(BackendClient backendClient, BackendProcessManager processManager)
    {
        _backendClient = backendClient;
        _processManager = processManager;

        ProfileSelection = new ProfileSelectionViewModel(
            backendClient,
            OnProfileLoadedAsync,
            UpdateStatusMessage);

        _currentViewModel = ProfileSelection;
    }

    public ProfileSelectionViewModel ProfileSelection { get; }

    public ViewModelBase CurrentViewModel
    {
        get => _currentViewModel;
        private set
        {
            if (SetProperty(ref _currentViewModel, value))
            {
                OnPropertyChanged(nameof(WindowTitle));
            }
        }
    }

    public string WindowTitle => CurrentViewModel is AppShellViewModel shell
        ? $"MyPal - {shell.ProfileName}"
        : "MyPal - Profile Selection";

    public async Task InitializeAsync()
    {
        if (_initialized)
        {
            return;
        }

        _initialized = true;

        UpdateStatusMessage("Starting backend...");
        await _processManager.EnsureRunningAsync(_lifetimeCts.Token).ConfigureAwait(false);
        
        UpdateStatusMessage("Loading profiles...");
        await ProfileSelection.InitializeAsync(_lifetimeCts.Token).ConfigureAwait(false);
        
        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            UpdateStatusMessage(null);
        });
    }

    private async Task OnProfileLoadedAsync(ProfileMetadata metadata, CancellationToken cancellationToken)
    {
        UpdateStatusMessage($"Loading {metadata.Name}...");
        var shell = new AppShellViewModel(
            metadata,
            _backendClient,
            UpdateStatusMessage,
            async () =>
            {
                CurrentViewModel = ProfileSelection;
                UpdateStatusMessage("Refreshing profiles...");
                await ProfileSelection.InitializeAsync(_lifetimeCts.Token).ConfigureAwait(false);
                UpdateStatusMessage(null);
            });

        CurrentViewModel = shell;
        await shell.InitializeAsync(cancellationToken).ConfigureAwait(false);
        UpdateStatusMessage(null);
    }

    private void UpdateStatusMessage(string? text)
    {
        if (Dispatcher.UIThread.CheckAccess())
        {
            StatusMessage = text;
        }
        else
        {
            Dispatcher.UIThread.Post(() => StatusMessage = text);
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _lifetimeCts.Cancel();
        _backendClient.Dispose();
        await _processManager.DisposeAsync().ConfigureAwait(false);
        _lifetimeCts.Dispose();
    }
}
