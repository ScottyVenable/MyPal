using System;
using System.Collections.Specialized;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Threading;
using MyPal.Desktop.ViewModels;

namespace MyPal.Desktop.Views;

public partial class ChatView : UserControl
{
    private ScrollViewer? _messagesScrollViewer;
    private INotifyCollectionChanged? _messageCollection;

    public ChatView()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
        Loaded += OnLoaded;
    }

    private void OnLoaded(object? sender, RoutedEventArgs e)
    {
        _messagesScrollViewer = this.FindControl<ScrollViewer>("MessagesScrollViewer");
        AttachMessageSource();
        ScrollToBottom();
    }

    private void OnDataContextChanged(object? sender, EventArgs e)
    {
        AttachMessageSource();
    }

    private void AttachMessageSource()
    {
        if (_messageCollection is not null)
        {
            _messageCollection.CollectionChanged -= OnMessagesChanged;
            _messageCollection = null;
        }

        if (DataContext is ChatViewModel vm)
        {
            _messageCollection = vm.Messages;
            _messageCollection.CollectionChanged += OnMessagesChanged;
        }
    }

    private void OnMessagesChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        ScrollToBottom();
    }

    private void ScrollToBottom()
    {
        if (_messagesScrollViewer is null)
        {
            return;
        }

        Dispatcher.UIThread.Post(() =>
        {
            _messagesScrollViewer!.ScrollToEnd();
        }, DispatcherPriority.Background);
    }
}
