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

public partial class AppShellViewModel : ViewModelBase
{
    private readonly Action<string?> _statusUpdater;
    private readonly Func<Task> _returnToMenuAsync;

    [ObservableProperty]
    private AppShellTabViewModel? _selectedTab;

    [ObservableProperty]
    private ViewModelBase? _currentContent;

    public AppShellViewModel(
        ProfileMetadata profile,
        BackendClient backendClient,
        Action<string?> statusUpdater,
        Func<Task> returnToMenuAsync)
    {
        Profile = profile ?? throw new ArgumentNullException(nameof(profile));
        _statusUpdater = statusUpdater ?? throw new ArgumentNullException(nameof(statusUpdater));
        _returnToMenuAsync = returnToMenuAsync ?? throw new ArgumentNullException(nameof(returnToMenuAsync));

        Chat = new ChatViewModel(backendClient, statusUpdater);
        Stats = new StatsViewModel();
        Brain = new BrainViewModel();
        Settings = new SettingsViewModel();

        Tabs = new ObservableCollection<AppShellTabViewModel>
        {
            new("Chat", "\uE8BD", Chat),
            new("Stats", "\uF1D3", Stats),
            new("Brain", "\uE175", Brain),
            new("Settings", "\uE713", Settings)
        };

        RefreshCommand = new AsyncRelayCommand(RefreshAsync);
        ExitCommand = new AsyncRelayCommand(ReturnToMenuAsync);

        SelectedTab = Tabs.First();
    }

    public ProfileMetadata Profile { get; }
    public string ProfileName => Profile.Name;

    public ChatViewModel Chat { get; }
    public StatsViewModel Stats { get; }
    public BrainViewModel Brain { get; }
    public SettingsViewModel Settings { get; }

    public ObservableCollection<AppShellTabViewModel> Tabs { get; }

    public AsyncRelayCommand RefreshCommand { get; }
    public AsyncRelayCommand ExitCommand { get; }

    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await Chat.InitializeAsync(cancellationToken).ConfigureAwait(false);
    }

    private async Task RefreshAsync(CancellationToken cancellationToken)
    {
        if (SelectedTab?.Content is ChatViewModel)
        {
            await Chat.RefreshAsync(cancellationToken).ConfigureAwait(false);
        }
    }

    private async Task ReturnToMenuAsync(CancellationToken cancellationToken)
    {
        _statusUpdater("Returning to profile menu...");
        await _returnToMenuAsync().ConfigureAwait(false);
        _statusUpdater(null);
    }

    partial void OnSelectedTabChanged(AppShellTabViewModel? value)
    {
        CurrentContent = value?.Content;
    }

    public sealed class AppShellTabViewModel : ViewModelBase
    {
        public AppShellTabViewModel(string title, string glyph, ViewModelBase content)
        {
            Title = title;
            Glyph = glyph;
            Content = content;
        }

        public string Title { get; }
        public string Glyph { get; }
        public ViewModelBase Content { get; }
    }

    public class PlaceholderViewModel : ViewModelBase
    {
        public PlaceholderViewModel(string message)
        {
            Message = message;
        }

        public string Message { get; }
    }

    public sealed class StatsViewModel : PlaceholderViewModel
    {
        public StatsViewModel() : base("Stats dashboard coming soon.")
        {
        }
    }

    public sealed class BrainViewModel : PlaceholderViewModel
    {
        public BrainViewModel() : base("Brain visualizations coming soon.")
        {
        }
    }

    public sealed class SettingsViewModel : PlaceholderViewModel
    {
        public SettingsViewModel() : base("Settings controls coming soon.")
        {
        }
    }
}
