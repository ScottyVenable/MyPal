using Avalonia;
using System;
using Avalonia.Data;
using Avalonia.Data.Converters;

namespace MyPal.Desktop.Converters;

public sealed class BooleanNegationConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is bool b)
        {
            return !b;
        }

        return AvaloniaProperty.UnsetValue;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is bool b)
        {
            return !b;
        }

        return AvaloniaProperty.UnsetValue;
    }
}
