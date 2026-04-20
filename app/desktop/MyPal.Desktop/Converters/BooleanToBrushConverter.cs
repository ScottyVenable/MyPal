using System;
using Avalonia;
using Avalonia.Data.Converters;
using Avalonia.Media;

namespace MyPal.Desktop.Converters;

public sealed class BooleanToBrushConverter : IValueConverter
{
    public IBrush TrueBrush { get; set; } = Brushes.White;
    public IBrush FalseBrush { get; set; } = Brushes.White;

    public object? Convert(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is bool flag)
        {
            return flag ? TrueBrush : FalseBrush;
        }

        return AvaloniaProperty.UnsetValue;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is IBrush brush)
        {
            return Equals(brush, TrueBrush);
        }

        return AvaloniaProperty.UnsetValue;
    }
}
