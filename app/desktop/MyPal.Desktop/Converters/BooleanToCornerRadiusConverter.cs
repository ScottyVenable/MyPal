using System;
using Avalonia;
using Avalonia.Data.Converters;

namespace MyPal.Desktop.Converters;

public sealed class BooleanToCornerRadiusConverter : IValueConverter
{
    public CornerRadius TrueValue { get; set; } = new(20);
    public CornerRadius FalseValue { get; set; } = new(20);

    public object? Convert(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is bool flag)
        {
            return flag ? TrueValue : FalseValue;
        }

        return AvaloniaProperty.UnsetValue;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is CornerRadius radius)
        {
            return radius.Equals(TrueValue);
        }

        return AvaloniaProperty.UnsetValue;
    }
}
