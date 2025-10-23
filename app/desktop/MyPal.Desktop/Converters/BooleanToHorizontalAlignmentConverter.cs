using System;
using Avalonia;
using Avalonia.Data.Converters;

namespace MyPal.Desktop.Converters;

public sealed class BooleanToHorizontalAlignmentConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is bool isRight)
        {
            return isRight ? Avalonia.Layout.HorizontalAlignment.Right : Avalonia.Layout.HorizontalAlignment.Left;
        }

        return AvaloniaProperty.UnsetValue;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is Avalonia.Layout.HorizontalAlignment alignment)
        {
            return alignment == Avalonia.Layout.HorizontalAlignment.Right;
        }

        return AvaloniaProperty.UnsetValue;
    }
}
