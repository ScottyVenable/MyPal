using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using MyPal.Desktop.Models;

namespace MyPal.Desktop.Services;

public sealed class BackendClient : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _serializerOptions;
    private string? _authToken;
    private bool _disposed;

    public BackendClient(Uri baseAddress, HttpMessageHandler? handler = null)
    {
        _httpClient = handler is null ? new HttpClient() : new HttpClient(handler);
        _httpClient.BaseAddress = baseAddress ?? throw new ArgumentNullException(nameof(baseAddress));
        _httpClient.Timeout = TimeSpan.FromSeconds(15);

        _serializerOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    public void SetAuthToken(string? token)
    {
        _authToken = string.IsNullOrWhiteSpace(token) ? null : token;
    }

    public Task<ProfileListResponse?> GetProfilesAsync(CancellationToken cancellationToken = default) =>
        GetAsync<ProfileListResponse>("api/profiles", cancellationToken);

    public Task<ProfileOperationResponse?> CreateProfileAsync(string name, CancellationToken cancellationToken = default) =>
        PostAsync<ProfileOperationResponse>("api/profiles", new { name }, cancellationToken);

    public Task<ProfileOperationResponse?> LoadProfileAsync(string profileId, CancellationToken cancellationToken = default) =>
        PostAsync<ProfileOperationResponse>($"api/profiles/{profileId}/load", new { }, cancellationToken);

    public Task<ChatLogResponse?> GetChatLogAsync(int limit = 200, CancellationToken cancellationToken = default) =>
        GetAsync<ChatLogResponse>($"api/chatlog?limit={limit}", cancellationToken);

    public Task<ChatResponse?> SendChatAsync(string message, CancellationToken cancellationToken = default) =>
        PostAsync<ChatResponse>("api/chat", new { message }, cancellationToken);

    public Task<StatsResponse?> GetStatsAsync(CancellationToken cancellationToken = default) =>
        GetAsync<StatsResponse>("api/stats", cancellationToken);

    public Task<BrainGraphResponse?> GetBrainGraphAsync(CancellationToken cancellationToken = default) =>
        GetAsync<BrainGraphResponse>("api/brain", cancellationToken);

    public Task<NeuralNetworkResponse?> GetNeuralNetworkAsync(CancellationToken cancellationToken = default) =>
        GetAsync<NeuralNetworkResponse>("api/neural-network", cancellationToken);

    public Task<MemoriesResponse?> GetMemoriesAsync(int limit = 20, CancellationToken cancellationToken = default) =>
        GetAsync<MemoriesResponse>($"api/memories?limit={limit}", cancellationToken);

    public Task<JournalResponse?> GetJournalAsync(int limit = 50, CancellationToken cancellationToken = default) =>
        GetAsync<JournalResponse>($"api/journal?limit={limit}", cancellationToken);

    public Task<SettingsResponse?> SaveSettingsAsync(SettingsRequest request, CancellationToken cancellationToken = default) =>
        PostAsync<SettingsResponse>("api/settings", request, cancellationToken);

    public Task<HttpResponseMessage> PingHealthAsync(CancellationToken cancellationToken = default) =>
        _httpClient.GetAsync("api/health", cancellationToken);

    private async Task<T?> GetAsync<T>(string relativeUrl, CancellationToken cancellationToken)
    {
        ThrowIfDisposed();
        using var request = new HttpRequestMessage(HttpMethod.Get, relativeUrl);
        AttachAuthHeader(request);
        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            return default;
        }

        return await response.Content.ReadFromJsonAsync<T>(_serializerOptions, cancellationToken).ConfigureAwait(false);
    }

    private async Task<T?> PostAsync<T>(string relativeUrl, object? payload, CancellationToken cancellationToken)
    {
        ThrowIfDisposed();
        var content = payload is null
            ? null
            : new StringContent(JsonSerializer.Serialize(payload, _serializerOptions), Encoding.UTF8, "application/json");

        using var request = new HttpRequestMessage(HttpMethod.Post, relativeUrl)
        {
            Content = content
        };

        AttachAuthHeader(request);
        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        if (!response.IsSuccessStatusCode)
        {
            return default;
        }

        return await response.Content.ReadFromJsonAsync<T>(_serializerOptions, cancellationToken).ConfigureAwait(false);
    }

    private void AttachAuthHeader(HttpRequestMessage request)
    {
        if (!string.IsNullOrWhiteSpace(_authToken))
        {
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authToken);
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _httpClient.Dispose();
    }

    private void ThrowIfDisposed()
    {
        if (_disposed)
        {
            throw new ObjectDisposedException(nameof(BackendClient));
        }
    }
}
