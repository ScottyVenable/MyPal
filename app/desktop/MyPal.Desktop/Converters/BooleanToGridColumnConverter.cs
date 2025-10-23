using System;
using Avalonia;
using Avalonia.Data.Converters;

namespace MyPal.Desktop.Converters;

public sealed class BooleanToGridColumnConverter : IValueConverter
{
    public int TrueColumn { get; set; } = 2;
    public int FalseColumn { get; set; } = 0;

    public object? Convert(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is bool flag)
        {
            return flag ? TrueColumn : FalseColumn;
        }

        return AvaloniaProperty.UnsetValue;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, System.Globalization.CultureInfo culture)
    {
        if (value is int column)
        {
            return column == TrueColumn;
        }

        return AvaloniaProperty.UnsetValue;
    }
}
