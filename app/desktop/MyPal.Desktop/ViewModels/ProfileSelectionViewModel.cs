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

public partial class ProfileSelectionViewModel : ViewModelBase
{
    private readonly BackendClient _backendClient;
    private readonly Func<ProfileMetadata, CancellationToken, Task> _onProfileLoadedAsync;
    private readonly Action<string?> _statusUpdater;

    public ProfileSelectionViewModel(
        BackendClient backendClient,
        Func<ProfileMetadata, CancellationToken, Task> onProfileLoadedAsync,
        Action<string?> statusUpdater)
    {
        _backendClient = backendClient ?? throw new ArgumentNullException(nameof(backendClient));
        _onProfileLoadedAsync = onProfileLoadedAsync ?? throw new ArgumentNullException(nameof(onProfileLoadedAsync));
        _statusUpdater = statusUpdater ?? throw new ArgumentNullException(nameof(statusUpdater));

        Profiles = new ObservableCollection<ProfileCardViewModel>();

        RefreshCommand = new AsyncRelayCommand(LoadProfilesAsync);
        CreateProfileCommand = new AsyncRelayCommand(CreateProfileAsync, CanCreateProfile);
        LoadSelectedCommand = new AsyncRelayCommand(LoadSelectedProfileAsync, () => SelectedProfile is not null && !IsBusy);
        LoadLastUsedCommand = new AsyncRelayCommand(LoadLastUsedProfileAsync, () => LastUsedProfile is not null && !IsBusy);
    }

    public ObservableCollection<ProfileCardViewModel> Profiles { get; }

    [ObservableProperty]
    private ProfileCardViewModel? _selectedProfile;

    [ObservableProperty]
    private ProfileCardViewModel? _lastUsedProfile;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private bool _isBusy;

    [ObservableProperty]
    private string _newProfileName = string.Empty;

    [ObservableProperty]
    private string? _errorMessage;

    public AsyncRelayCommand RefreshCommand { get; }
    public AsyncRelayCommand CreateProfileCommand { get; }
    public AsyncRelayCommand LoadSelectedCommand { get; }
    public AsyncRelayCommand LoadLastUsedCommand { get; }

    public bool HasLastUsedProfile => LastUsedProfile is not null;
    public bool HasError => !string.IsNullOrWhiteSpace(ErrorMessage);

    public string HeaderSubtitle => Profiles.Count == 0
        ? "Create your first Pal to get started."
        : "Choose a Pal or create something new.";

    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await LoadProfilesAsync(cancellationToken).ConfigureAwait(false);
    }

    partial void OnSelectedProfileChanged(ProfileCardViewModel? value)
    {
        LoadSelectedCommand.NotifyCanExecuteChanged();
    }

    partial void OnNewProfileNameChanged(string value)
    {
        CreateProfileCommand.NotifyCanExecuteChanged();
    }

    partial void OnLastUsedProfileChanged(ProfileCardViewModel? value)
    {
        OnPropertyChanged(nameof(HasLastUsedProfile));
        LoadLastUsedCommand.NotifyCanExecuteChanged();
    }

    partial void OnErrorMessageChanged(string? value)
    {
        OnPropertyChanged(nameof(HasError));
    }

    partial void OnIsBusyChanged(bool value)
    {
        CreateProfileCommand.NotifyCanExecuteChanged();
        LoadSelectedCommand.NotifyCanExecuteChanged();
        LoadLastUsedCommand.NotifyCanExecuteChanged();
    }

    private async Task LoadProfilesAsync(CancellationToken cancellationToken = default)
    {
        if (IsLoading)
        {
            return;
        }

        try
        {
            IsLoading = true;
            ErrorMessage = null;

            var response = await _backendClient.GetProfilesAsync(cancellationToken).ConfigureAwait(false);
            Profiles.Clear();

            if (response is null)
            {
                ErrorMessage = "Unable to reach backend. Please ensure the server is running.";
                return;
            }

            foreach (var profile in response.Profiles.OrderByDescending(p => p.LastPlayedAt ?? 0))
            {
                Profiles.Add(new ProfileCardViewModel(profile));
            }

            LastUsedProfile = Profiles.FirstOrDefault(p => p.Id == response.LastUsedId);
            SelectedProfile = LastUsedProfile ?? Profiles.FirstOrDefault();

            OnPropertyChanged(nameof(HeaderSubtitle));
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Failed to load profiles: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    private bool CanCreateProfile()
    {
        return !IsBusy && !string.IsNullOrWhiteSpace(NewProfileName);
    }

    private async Task CreateProfileAsync(CancellationToken cancellationToken)
    {
        if (IsBusy)
        {
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            _statusUpdater("Creating profile...");

            var response = await _backendClient.CreateProfileAsync(NewProfileName.Trim(), cancellationToken).ConfigureAwait(false);
            if (response is null)
            {
                ErrorMessage = "Profile creation failed. Please try again.";
                return;
            }

            if (!response.Success || response.Profile is null)
            {
                ErrorMessage = response.Error ?? "Unable to create profile.";
                return;
            }

            NewProfileName = string.Empty;
            await LoadProfilesAsync(cancellationToken).ConfigureAwait(false);

            // Automatically load newly created profile
            await _onProfileLoadedAsync(response.Profile, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            // Swallow cancellation.
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Error creating profile: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
            _statusUpdater(null);
        }
    }

    private async Task LoadSelectedProfileAsync(CancellationToken cancellationToken)
    {
        if (SelectedProfile is null || IsBusy)
        {
            return;
        }

        try
        {
            IsBusy = true;
            ErrorMessage = null;
            _statusUpdater($"Loading {SelectedProfile.Name}...");

            var result = await _backendClient.LoadProfileAsync(SelectedProfile.Id, cancellationToken).ConfigureAwait(false);
            if (result is null)
            {
                ErrorMessage = "Failed to reach backend while loading profile.";
                return;
            }

            if (!result.Success || result.Profile is null)
            {
                ErrorMessage = result.Error ?? "Profile could not be loaded.";
                return;
            }

            await _onProfileLoadedAsync(result.Profile, cancellationToken).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception ex)
        {
            ErrorMessage = $"Error loading profile: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
            _statusUpdater(null);
        }
    }

    private async Task LoadLastUsedProfileAsync(CancellationToken cancellationToken)
    {
        if (LastUsedProfile is null)
        {
            return;
        }

        SelectedProfile = LastUsedProfile;
        await LoadSelectedProfileAsync(cancellationToken).ConfigureAwait(false);
    }
}

public sealed partial class ProfileCardViewModel : ObservableObject
{
    public ProfileCardViewModel(ProfileSummary summary)
    {
        Id = summary.Id;
        Name = summary.Name;
        Level = summary.Level ?? 1;
        Xp = summary.Xp ?? 0;
        MessageCount = summary.MessageCount ?? 0;
        MemoryCount = summary.MemoryCount ?? 0;
        CreatedAt = summary.CreatedAt.HasValue ? DateTimeOffset.FromUnixTimeMilliseconds(summary.CreatedAt.Value).LocalDateTime : (DateTime?)null;
        LastPlayedAt = summary.LastPlayedAt.HasValue ? DateTimeOffset.FromUnixTimeMilliseconds(summary.LastPlayedAt.Value).LocalDateTime : (DateTime?)null;
    }

    public string Id { get; }
    public string Name { get; }
    public int Level { get; }
    public int Xp { get; }
    public int MessageCount { get; }
    public int MemoryCount { get; }
    public DateTime? CreatedAt { get; }
    public DateTime? LastPlayedAt { get; }

    public string LastPlayedDescription => LastPlayedAt is null
        ? "Never Played"
        : $"Last played {LastPlayedAt:G}";
}


