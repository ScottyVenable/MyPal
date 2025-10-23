using System;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using MyPal.Desktop.Models;
using MyPal.Desktop.Services;

namespace MyPal.Desktop.ViewModels;

public partial class ChatViewModel : ViewModelBase
{
    private readonly BackendClient _backendClient;
    private readonly Action<string?> _statusUpdater;

    public ChatViewModel(BackendClient backendClient, Action<string?> statusUpdater)
    {
        _backendClient = backendClient ?? throw new ArgumentNullException(nameof(backendClient));
        _statusUpdater = statusUpdater ?? throw new ArgumentNullException(nameof(statusUpdater));

        Messages = new ObservableCollection<ChatMessageViewModel>();
        SendMessageCommand = new AsyncRelayCommand(SendMessageAsync, CanSendMessage);
        RefreshCommand = new AsyncRelayCommand(RefreshAsync);
    }

    public ObservableCollection<ChatMessageViewModel> Messages { get; }

    [ObservableProperty]
    private string _composeText = string.Empty;

    [ObservableProperty]
    private bool _isBusy;

    [ObservableProperty]
    private bool _isAwaitingResponse;

    [ObservableProperty]
    private string? _errorMessage;

    public AsyncRelayCommand SendMessageCommand { get; }
    public AsyncRelayCommand RefreshCommand { get; }

    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await RefreshAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task RefreshAsync(CancellationToken cancellationToken = default)
    {
        if (IsBusy && !IsAwaitingResponse)
        {
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            _statusUpdater("Loading conversation...");

            var response = await _backendClient.GetChatLogAsync(200, cancellationToken).ConfigureAwait(false);
            Messages.Clear();

            if (response?.Messages is { Count: > 0 } history)
            {
                foreach (var message in history.OrderBy(m => m.Timestamp))
                {
                    Messages.Add(ChatMessageViewModel.FromDto(message));
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to load chat: {ex.Message}";
        }
        finally
        {
            _statusUpdater(null);
            IsBusy = false;
            IsAwaitingResponse = false;
            SendMessageCommand.NotifyCanExecuteChanged();
        }
    }

    private bool CanSendMessage()
    {
        return !IsBusy && !IsAwaitingResponse && !string.IsNullOrWhiteSpace(ComposeText);
    }

    private async Task SendMessageAsync(CancellationToken cancellationToken)
    {
        var text = ComposeText?.Trim();
        if (string.IsNullOrEmpty(text))
        {
            return;
        }

        try
        {
            IsBusy = true;
            IsAwaitingResponse = true;
            ErrorMessage = null;
            _statusUpdater("Sending message...");

            ComposeText = string.Empty;
            Messages.Add(ChatMessageViewModel.CreateUserMessage(text));

            var response = await _backendClient.SendChatAsync(text, cancellationToken).ConfigureAwait(false);
            if (response is null)
            {
                ErrorMessage = "No response from Pal.";
                return;
            }

            Messages.Add(ChatMessageViewModel.CreatePalMessage(response));
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to send message: {ex.Message}";
        }
        finally
        {
            IsAwaitingResponse = false;
            IsBusy = false;
            _statusUpdater(null);
            SendMessageCommand.NotifyCanExecuteChanged();
        }
    }
}

public sealed class ChatMessageViewModel : ViewModelBase
{
    public ChatMessageViewModel(string sender, string text, DateTime timestamp, bool isUser, string? kind = null)
    {
        Sender = sender;
        Text = text;
        Timestamp = timestamp;
        IsUser = isUser;
        Kind = kind;
    }

    public string Sender { get; }
    public string Text { get; }
    public DateTime Timestamp { get; }
    public bool IsUser { get; }
    public string? Kind { get; }

    public string DisplayTime => Timestamp.ToString("t");

    public static ChatMessageViewModel FromDto(ChatMessage dto)
    {
        var timestamp = DateTimeOffset.FromUnixTimeMilliseconds(dto.Timestamp).LocalDateTime;
        var sender = string.Equals(dto.Role, "user", StringComparison.OrdinalIgnoreCase) ? "You" : "Pal";
        var isUser = string.Equals(dto.Role, "user", StringComparison.OrdinalIgnoreCase);

        return new ChatMessageViewModel(sender, dto.Text, timestamp, isUser, dto.Kind);
    }

    public static ChatMessageViewModel CreateUserMessage(string text)
    {
        return new ChatMessageViewModel("You", text, DateTime.Now, true, "user");
    }

    public static ChatMessageViewModel CreatePalMessage(ChatResponse response)
    {
        return new ChatMessageViewModel("Pal", response.Reply, DateTime.Now, false, response.Kind);
    }
}
