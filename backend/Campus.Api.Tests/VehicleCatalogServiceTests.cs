using Campus.Api.Services;
using Xunit;

namespace Campus.Api.Tests;

public class VehicleCatalogServiceTests
{
    // =========================================
    // BRAND VALIDATION
    // =========================================

    [Theory]
    [InlineData("Hyundai", "Hyundai")]
    [InlineData("hyundai", "Hyundai")]
    [InlineData("  TOYOTA  ", "Toyota")]
    [InlineData("bmw", "BMW")]
    [InlineData("mg", "MG")]
    [InlineData("Mercedes-Benz", "Mercedes-Benz")]
    [InlineData("BAIC", "BAIC")]
    [InlineData("Dongfeng", "Dongfeng")]
    public void NormalizeBrand_ValidBrand_ReturnsCanonicalName(
        string input,
        string expected)
    {
        var result =
            VehicleCatalogService.NormalizeBrand(input);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("ImaginaryCar")]
    [InlineData("FakeMotors")]
    [InlineData("123456")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void NormalizeBrand_InvalidBrand_ReturnsNull(
        string? input)
    {
        Assert.Null(
            VehicleCatalogService.NormalizeBrand(input));
    }

    // =========================================
    // MODEL VALIDATION
    // =========================================

    [Theory]
    [InlineData("Hyundai", "Elantra", "Elantra")]
    [InlineData("Toyota", "corolla", "Corolla")]
    [InlineData("BMW", "  x5  ", "X5")]
    [InlineData("MG", "mg 5", "MG 5")]
    [InlineData("BAIC", "U5 Plus", "U5 Plus")]
    [InlineData("Changan", "Eado", "Eado")]
    [InlineData("Dongfeng", "Shine", "Shine")]
    [InlineData("hyundai", "TUCSON", "Tucson")]
    public void NormalizeModel_ValidPair_ReturnsCanonicalModel(
        string brand,
        string model,
        string expected)
    {
        var result =
            VehicleCatalogService.NormalizeModel(
                brand, model);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("Hyundai", "Corolla")]
    [InlineData("Toyota", "Elantra")]
    [InlineData("BMW", "Sunny")]
    [InlineData("MG", "ImaginaryModel")]
    [InlineData("FakeBrand", "Corolla")]
    [InlineData("Hyundai", "")]
    [InlineData("Hyundai", null)]
    [InlineData(null, "Elantra")]
    public void NormalizeModel_InvalidPair_ReturnsNull(
        string? brand,
        string? model)
    {
        Assert.Null(
            VehicleCatalogService.NormalizeModel(
                brand, model));
    }

    // =========================================
    // COLOR VALIDATION
    // =========================================

    [Theory]
    [InlineData("White", "White")]
    [InlineData("black", "Black")]
    [InlineData("  SILVER  ", "Silver")]
    [InlineData("gray", "Grey")]
    [InlineData("grey", "Grey")]
    [InlineData("Gold", "Gold")]
    [InlineData("Burgundy", "Burgundy")]
    [InlineData("Bronze", "Bronze")]
    public void NormalizeColor_ValidColor_ReturnsCanonicalName(
        string color,
        string expected)
    {
        Assert.Equal(
            expected,
            VehicleCatalogService.NormalizeColor(color));
    }

    [Theory]
    [InlineData("ImaginaryColor")]
    [InlineData("#123456")]
    [InlineData("Rainbow")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void NormalizeColor_InvalidColor_ReturnsNull(
        string? color)
    {
        Assert.Null(
            VehicleCatalogService.NormalizeColor(color));
    }

    // =========================================
    // COMPLETE VEHICLE VALIDATION
    // =========================================

    [Theory]
    [InlineData("Hyundai", "Elantra", "Silver")]
    [InlineData("Toyota", "Corolla", "Black")]
    [InlineData("BMW", "X5", "White")]
    [InlineData("MG", "MG 5", "Gold")]
    [InlineData("BAIC", "U5 Plus", "Blue")]
    public void TryValidateVehicle_ValidDetails_ReturnsTrue(
        string brand,
        string model,
        string color)
    {
        bool result =
            VehicleCatalogService.TryValidateVehicle(
                brand,
                model,
                color,
                out string normalizedBrand,
                out string normalizedModel,
                out string normalizedColor,
                out string error);

        Assert.True(result);
        Assert.Equal(brand, normalizedBrand);
        Assert.Equal(model, normalizedModel);
        Assert.Equal(color, normalizedColor);
        Assert.Empty(error);
    }

    [Fact]
    public void TryValidateVehicle_NormalizesAllFields()
    {
        bool result =
            VehicleCatalogService.TryValidateVehicle(
                "  hyundai  ",
                "  ELANTRA  ",
                "  gray  ",
                out string brand,
                out string model,
                out string color,
                out string error);

        Assert.True(result);
        Assert.Equal("Hyundai", brand);
        Assert.Equal("Elantra", model);
        Assert.Equal("Grey", color);
        Assert.Empty(error);
    }

    [Fact]
    public void TryValidateVehicle_InvalidBrand_ReturnsError()
    {
        bool result =
            VehicleCatalogService.TryValidateVehicle(
                "ImaginaryCar",
                "Elantra",
                "Silver",
                out _,
                out _,
                out _,
                out string error);

        Assert.False(result);

        Assert.Equal(
            "Select a valid car brand from the vehicle catalog.",
            error);
    }

    [Fact]
    public void TryValidateVehicle_InvalidModel_ReturnsError()
    {
        bool result =
            VehicleCatalogService.TryValidateVehicle(
                "Hyundai",
                "Corolla",
                "Silver",
                out _,
                out _,
                out _,
                out string error);

        Assert.False(result);

        Assert.Equal(
            "Select a valid model for the chosen car brand.",
            error);
    }

    [Fact]
    public void TryValidateVehicle_InvalidColor_ReturnsError()
    {
        bool result =
            VehicleCatalogService.TryValidateVehicle(
                "Toyota",
                "Corolla",
                "ImaginaryColor",
                out _,
                out _,
                out _,
                out string error);

        Assert.False(result);

        Assert.Equal(
            "Select a valid vehicle color from the catalog.",
            error);
    }

    [Fact]
    public void TryValidateVehicle_InvalidInput_ClearsOutputs()
    {
        bool result =
            VehicleCatalogService.TryValidateVehicle(
                "Toyota",
                "Corolla",
                "InvalidColor",
                out string brand,
                out string model,
                out string color,
                out string error);

        Assert.False(result);

        Assert.Empty(brand);
        Assert.Empty(model);
        Assert.Empty(color);
        Assert.NotEmpty(error);
    }

    // =========================================
    // CATALOG INTEGRITY
    // =========================================

    [Fact]
    public void GetBrands_ReturnsNonEmptyCatalog()
    {
        var brands =
            VehicleCatalogService.GetBrands();

        Assert.NotEmpty(brands);
    }

    [Fact]
    public void GetBrands_BrandsAreUnique()
    {
        var brands =
            VehicleCatalogService.GetBrands();

        var names = brands
            .Select(brand => brand.Name)
            .ToArray();

        var uniqueNames = names
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        Assert.Equal(
            names.Length,
            uniqueNames.Length);
    }

    [Fact]
    public void GetBrands_BrandsAreAlphabeticallySorted()
    {
        var names = VehicleCatalogService
            .GetBrands()
            .Select(brand => brand.Name)
            .ToArray();

        var sortedNames = names
            .OrderBy(
                name => name,
                StringComparer.OrdinalIgnoreCase)
            .ToArray();

        Assert.Equal(sortedNames, names);
    }

    [Fact]
    public void GetBrands_EveryBrandHasModels()
    {
        foreach (
            var brand in VehicleCatalogService.GetBrands())
        {
            Assert.NotEmpty(brand.Models);

            Assert.All(
                brand.Models,
                model => Assert.False(
                    string.IsNullOrWhiteSpace(model)));
        }
    }

    [Fact]
    public void GetBrands_NoDuplicateModelsWithinBrand()
    {
        foreach (
            var brand in VehicleCatalogService.GetBrands())
        {
            var uniqueModels = brand.Models
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            Assert.Equal(
                brand.Models.Count,
                uniqueModels.Length);
        }
    }

    [Fact]
    public void GetBrands_ModelsAreAlphabeticallySorted()
    {
        foreach (
            var brand in VehicleCatalogService.GetBrands())
        {
            var sortedModels = brand.Models
                .OrderBy(
                    model => model,
                    StringComparer.OrdinalIgnoreCase)
                .ToArray();

            Assert.Equal(
                sortedModels,
                brand.Models.ToArray());
        }
    }

    [Fact]
    public void GetColors_ReturnsNonEmptyCatalog()
    {
        Assert.NotEmpty(
            VehicleCatalogService.GetColors());
    }

    [Fact]
    public void GetColors_ColorNamesAreUnique()
    {
        var colors = VehicleCatalogService
            .GetColors()
            .Select(color => color.Name)
            .ToArray();

        var uniqueColors = colors
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        Assert.Equal(
            colors.Length,
            uniqueColors.Length);
    }

    [Fact]
    public void GetColors_AllColorsHaveValidHexCodes()
    {
        foreach (
            var color in VehicleCatalogService.GetColors())
        {
            Assert.Matches(
                "^#[0-9A-Fa-f]{6}$",
                color.Hex);
        }
    }

    [Fact]
    public void GetCatalog_AllPublishedOptionsAreAccepted()
    {
        foreach (
            var brand in VehicleCatalogService.GetBrands())
        {
            Assert.True(
                VehicleCatalogService.IsValidBrand(
                    brand.Name));

            foreach (var model in brand.Models)
            {
                Assert.True(
                    VehicleCatalogService.IsValidModel(
                        brand.Name, model));
            }
        }

        foreach (
            var color in VehicleCatalogService.GetColors())
        {
            Assert.True(
                VehicleCatalogService.IsValidColor(
                    color.Name));
        }
    }
}
