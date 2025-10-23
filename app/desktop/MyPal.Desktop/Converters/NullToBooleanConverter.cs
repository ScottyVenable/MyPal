using Avalonia;
using System;
using Avalonia.Data;
using Avalonia.Data.Converters;

namespace MyPal.Desktop.Converters;

public sealed class NullToBooleanConverter : IValueConverter
{
    public bool Invert { get; set; }

    public object? Convert(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        var result = value is not null;
        if (Invert)
        {
            result = !result;
        }
        return result;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is bool boolean)
        {
            var result = boolean;
            if (Invert)
            {
                result = !result;
            }

            return result ? new object() : null;
        }

        return AvaloniaProperty.UnsetValue;
    }
}
