using System.Text;
using System.Text.RegularExpressions;

namespace Campus.Api.Services;

public static class LicensePlateService
{
    private static readonly Regex LettersFirst = new(
        @"\A([\u0621-\u063A\u0641-\u064A]{2,3})([0-9]{3,4})\z",
        RegexOptions.CultureInvariant);

    private static readonly Regex DigitsFirst = new(
        @"\A([0-9]{3,4})([\u0621-\u063A\u0641-\u064A]{2,3})\z",
        RegexOptions.CultureInvariant);

    public static string NormalizeDigits(string value)
    {
        var result = new StringBuilder(value.Length);

        foreach (char character in value)
        {
            if (character >= '\u0660' &&
                character <= '\u0669')
            {
                result.Append(
                    (char)('0' + character - '\u0660'));
            }
            else if (character >= '\u06F0' &&
                     character <= '\u06F9')
            {
                result.Append(
                    (char)('0' + character - '\u06F0'));
            }
            else
            {
                result.Append(character);
            }
        }

        return result.ToString();
    }

    public static string NormalizePlate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            value.Length > 100)
        {
            return string.Empty;
        }

        string normalized;

        try
        {
            normalized = value.Normalize(
                NormalizationForm.FormKC);
        }
        catch (ArgumentException)
        {
            return string.Empty;
        }

        normalized = NormalizeDigits(normalized)
            .Replace('\u0623', '\u0627')
            .Replace('\u0625', '\u0627')
            .Replace('\u0622', '\u0627')
            .Replace('\u0649', '\u064A');

        var cleaned = new StringBuilder();

        foreach (char character in normalized)
        {
            if (char.IsWhiteSpace(character) ||
                character == '|' ||
                character == '\u0640')
            {
                continue;
            }

            cleaned.Append(character);
        }

        string plate = cleaned.ToString();

        Match match = LettersFirst.Match(plate);

        if (match.Success)
        {
            return $"{match.Groups[1].Value} " +
                   $"{match.Groups[2].Value}";
        }

        match = DigitsFirst.Match(plate);

        if (match.Success)
        {
            return $"{match.Groups[2].Value} " +
                   $"{match.Groups[1].Value}";
        }

        return string.Empty;
    }

    public static bool IsValidPlate(string? value)
    {
        return NormalizePlate(value).Length > 0;
    }

    public static string FormatDisplayPlate(string? value)
    {
        string normalized = NormalizePlate(value);

        if (string.IsNullOrEmpty(normalized))
        {
            return string.Empty;
        }

        string[] parts = normalized.Split(' ');

        string letters = string.Join(
            " ", parts[0].ToCharArray());

        var digits = new StringBuilder();

        foreach (char digit in parts[1])
        {
            digits.Append(
                (char)('\u0660' + digit - '0'));
        }

        return $"{letters} {digits}";
    }
}
