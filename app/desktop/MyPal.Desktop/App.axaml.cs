using System;
using System.IO;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Data.Core;
using Avalonia.Data.Core.Plugins;
using System.Linq;
using Avalonia.Markup.Xaml;
using MyPal.Desktop.ViewModels;
using MyPal.Desktop.Views;
using MyPal.Desktop.Services;

namespace MyPal.Desktop;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // Avoid duplicate validations from both Avalonia and the CommunityToolkit. 
            // More info: https://docs.avaloniaui.net/docs/guides/development-guides/data-validation#manage-validationplugins
            DisableAvaloniaDataAnnotationValidation();

            try
            {
                var rootAppDir = ResolveAppDirectory();
                System.Diagnostics.Debug.WriteLine($"[App] Root directory resolved to: {rootAppDir}");
                
                var backendDir = Path.Combine(rootAppDir, "app", "backend");
                System.Diagnostics.Debug.WriteLine($"[App] Backend directory: {backendDir}");
                
                if (!Directory.Exists(backendDir))
                {
                    throw new DirectoryNotFoundException($"Backend directory not found at: {backendDir}");
                }
                
                var backendClient = new BackendClient(new Uri("http://localhost:3001/"));
                var backendProcessManager = new BackendProcessManager(backendDir, 3001);
                var mainWindowViewModel = new MainWindowViewModel(backendClient, backendProcessManager);

                var mainWindow = new MainWindow
                {
                    DataContext = mainWindowViewModel,
                };

                mainWindow.Opened += async (_, _) => 
                {
                    try
                    {
                        await mainWindowViewModel.InitializeAsync();
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"[App] Error during initialization: {ex}");
                        throw;
                    }
                };
                
                mainWindow.Closed += async (_, _) => await mainWindowViewModel.DisposeAsync();

                desktop.MainWindow = mainWindow;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[App] Fatal error during framework initialization: {ex}");
                throw;
            }
        }

        base.OnFrameworkInitializationCompleted();
    }

    private void DisableAvaloniaDataAnnotationValidation()
    {
        // Get an array of plugins to remove
        var dataValidationPluginsToRemove =
            BindingPlugins.DataValidators.OfType<DataAnnotationsValidationPlugin>().ToArray();

        // remove each entry found
        foreach (var plugin in dataValidationPluginsToRemove)
        {
            BindingPlugins.DataValidators.Remove(plugin);
        }
    }

    private static string ResolveAppDirectory()
    {
        var baseDir = AppContext.BaseDirectory;
        
        // When debugging, we're in: app/desktop/MyPal.Desktop/bin/Debug/net8.0/
        // We need to get to the root: MyPal/
        // That's 6 levels up from bin/Debug/net8.0/ to MyPal.Desktop/, then 3 more to MyPal/
        
        // Try to find the MyPal root directory by looking for app/backend
        var currentDir = new DirectoryInfo(baseDir);
        
        while (currentDir != null && currentDir.Parent != null)
        {
            var backendPath = Path.Combine(currentDir.FullName, "app", "backend");
            if (Directory.Exists(backendPath))
            {
                return currentDir.FullName;
            }
            currentDir = currentDir.Parent;
        }
        
        // Fallback: Navigate up 6 levels (from bin/Debug/net8.0/ to root)
        var appDir = Path.GetFullPath(Path.Combine(baseDir, "..", "..", "..", "..", "..", ".."));
        if (!Directory.Exists(appDir))
        {
            throw new DirectoryNotFoundException(
                $"Unable to locate application directory. " +
                $"Base directory: {baseDir}, " +
                $"Attempted path: {appDir}");
        }

        return appDir;
    }
}
