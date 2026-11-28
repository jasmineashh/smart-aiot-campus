using Campus.Api.Services;
using Xunit;

namespace Campus.Api.Tests;

public class LicensePlateServiceTests
{
    [Theory]
    [InlineData("س ب ج ١٢٣٤", "سبج 1234")]
    [InlineData("سبج 1234", "سبج 1234")]
    [InlineData("س ب ج ۱۲۳۴", "سبج 1234")]
    [InlineData("1234 سبج", "سبج 1234")]
    [InlineData("١٢٣٤ س ب ج", "سبج 1234")]
    [InlineData("س ب ج | ١٢٣٤", "سبج 1234")]
    [InlineData("أ ب ج ١٢٣٤", "ابج 1234")]
    [InlineData("إ ب ج ١٢٣٤", "ابج 1234")]
    [InlineData("آ ب ج ١٢٣٤", "ابج 1234")]
    [InlineData("ى ب ج 1234", "يبج 1234")]
    [InlineData("سـبـج 1234", "سبج 1234")]
    [InlineData("س ب ١٢٣", "سب 123")]
    public void NormalizePlate_ValidInput_ReturnsCanonicalPlate(
        string input,
        string expected)
    {
        string result =
            LicensePlateService.NormalizePlate(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ABC 1234")]
    [InlineData("TEST-001")]
    [InlineData("س 1234")]
    [InlineData("س ب ج د 1234")]
    [InlineData("س ب ج 12")]
    [InlineData("س ب ج 12345")]
    [InlineData("1234")]
    [InlineData("سبج")]
    [InlineData("س ب ج @1234")]
    public void NormalizePlate_InvalidInput_ReturnsEmpty(
        string? input)
    {
        string result =
            LicensePlateService.NormalizePlate(input);

        Assert.Equal(string.Empty, result);
    }

    [Theory]
    [InlineData("سبج 1234", "س ب ج ١٢٣٤")]
    [InlineData("سب 123", "س ب ١٢٣")]
    [InlineData("س ب ج ۱۲۳۴", "س ب ج ١٢٣٤")]
    [InlineData("1234 سبج", "س ب ج ١٢٣٤")]
    public void FormatDisplayPlate_ValidInput_ReturnsArabicPlate(
        string input,
        string expected)
    {
        string result =
            LicensePlateService.FormatDisplayPlate(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("س ب ج ١٢٣٤", true)]
    [InlineData("سبج 1234", true)]
    [InlineData("ABC 1234", false)]
    [InlineData(null, false)]
    public void IsValidPlate_ReturnsExpectedResult(
        string? input,
        bool expected)
    {
        Assert.Equal(
            expected,
            LicensePlateService.IsValidPlate(input));
    }

    [Fact]
    public void NormalizeDigits_ConvertsArabicAndPersianDigits()
    {
        string input = "٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹";

        Assert.Equal(
            "01234567890123456789",
            LicensePlateService.NormalizeDigits(input));
    }

    [Fact]
    public void NormalizePlate_EquivalentFormats_ReturnSameValue()
    {
        string first = LicensePlateService.NormalizePlate(
            "س ب ج ١٢٣٤");

        string second = LicensePlateService.NormalizePlate(
            "1234 سبج");

        string third = LicensePlateService.NormalizePlate(
            "سبج ۱۲۳۴");

        Assert.Equal(first, second);
        Assert.Equal(second, third);
    }

    [Fact]
    public void NormalizePlate_IsIdempotent()
    {
        string normalized = LicensePlateService.NormalizePlate(
            "س ب ج ١٢٣٤");

        Assert.Equal(
            normalized,
            LicensePlateService.NormalizePlate(normalized));
    }

    [Fact]
    public void NormalizePlate_ExcessivelyLongInput_ReturnsEmpty()
    {
        string input = new string(' ', 101) + "سبج 1234";

        Assert.Equal(
            string.Empty,
            LicensePlateService.NormalizePlate(input));
    }
}
