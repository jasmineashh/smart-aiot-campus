using Campus.Api.Services;
using Xunit;
using Xunit.Abstractions;

namespace Campus.Api.Tests;

public class VehicleBodyTypeServiceTests
{
    private readonly ITestOutputHelper _output;

    public VehicleBodyTypeServiceTests(
        ITestOutputHelper output)
    {
        _output = output;
    }

    // =========================================
    // SINGLE BODY TYPE CLASSIFICATIONS
    // =========================================

    [Theory]
    [InlineData("Jeep", "Grand Cherokee", "SUV")]
    [InlineData("Jeep", "Wrangler", "SUV")]
    [InlineData("Hyundai", "Tucson", "SUV")]
    [InlineData("Hyundai", "Elantra CN7", "Sedan")]
    [InlineData("Hyundai", "Elantra AD", "Sedan")]
    [InlineData("Hyundai", "Elantra HD", "Sedan")]
    [InlineData("Hyundai", "i10", "Hatchback")]
    [InlineData("Toyota", "Hilux", "Pickup")]
    [InlineData("Toyota", "Fortuner", "SUV")]
    [InlineData("Toyota", "Hiace", "Van")]
    [InlineData("Toyota", "Belta", "Sedan")]
    [InlineData("BMW", "X5", "SUV")]
    [InlineData("BMW", "X3", "SUV")]
    [InlineData("Kia", "Picanto", "Hatchback")]
    [InlineData("Kia", "Sportage", "SUV")]
    [InlineData("Kia", "Carnival", "Van")]
    [InlineData("Nissan", "Qashqai", "SUV")]
    [InlineData("Nissan", "Navara", "Pickup")]
    [InlineData("Ford", "Ranger", "Pickup")]
    [InlineData("Volvo", "V60", "Wagon")]
    [InlineData("Volvo", "V90", "Wagon")]
    [InlineData("Mazda", "MX-5", "Convertible")]
    [InlineData("Subaru", "BRZ", "Coupe")]
    [InlineData("MG", "MG 4", "Hatchback")]
    [InlineData("MG", "ZS", "SUV")]
    [InlineData("BAIC", "U5 Plus", "Sedan")]
    [InlineData("Dongfeng", "Shine", "Sedan")]
    [InlineData("Changan", "UNI-K", "SUV")]
    [InlineData("Tesla", "Model Y", "SUV")]
    [InlineData("Tesla", "Model 3", "Sedan")]
    public void GetBodyTypes_SingleClassification_ReturnsCorrectType(
        string brand,
        string model,
        string expected)
    {
        var types =
            VehicleBodyTypeService.GetBodyTypes(
                brand,
                model);

        Assert.Single(types);

        Assert.Equal(
            expected,
            types[0]);
    }

    // =========================================
    // MODELS WITH MULTIPLE BODY TYPES
    // =========================================

    [Theory]
    [InlineData(
        "Toyota", "Corolla",
        "Sedan", "Hatchback")]

    [InlineData(
        "Toyota", "Corolla",
        "Sedan", "Wagon")]

    [InlineData(
        "Toyota", "Yaris",
        "Sedan", "Hatchback")]

    [InlineData(
        "Hyundai", "Elantra",
        "Sedan", "Hatchback")]

    [InlineData(
        "Hyundai", "Elantra",
        "Sedan", "Coupe")]

    [InlineData(
        "BMW", "3 Series",
        "Sedan", "Wagon")]

    [InlineData(
        "BMW", "3 Series",
        "Coupe", "Convertible")]

    [InlineData(
        "Ford", "Mustang",
        "Coupe", "Convertible")]

    [InlineData(
        "Volkswagen", "Golf",
        "Hatchback", "Wagon")]

    [InlineData(
        "Honda", "Civic",
        "Sedan", "Hatchback")]

    [InlineData(
        "MG", "MG 5",
        "Sedan", "Wagon")]

    [InlineData(
        "Mercedes-Benz", "C-Class",
        "Sedan", "Coupe")]

    public void GetBodyTypes_MultipleClassifications_ReturnsAvailableTypes(
        string brand,
        string model,
        string expectedFirst,
        string expectedSecond)
    {
        var types =
            VehicleBodyTypeService.GetBodyTypes(
                brand,
                model);

        Assert.True(types.Count > 1);

        Assert.Contains(
            expectedFirst,
            types);

        Assert.Contains(
            expectedSecond,
            types);
    }

    // =========================================
    // AUTOMATIC BODY TYPE SELECTION
    // =========================================

    [Theory]
    [InlineData("Jeep", "Grand Cherokee", "SUV")]
    [InlineData("Hyundai", "Elantra CN7", "Sedan")]
    [InlineData("Toyota", "Hilux", "Pickup")]
    [InlineData("Kia", "Picanto", "Hatchback")]
    [InlineData("Toyota", "Hiace", "Van")]
    [InlineData("Volvo", "V60", "Wagon")]
    [InlineData("Mazda", "MX-5", "Convertible")]
    [InlineData("Subaru", "BRZ", "Coupe")]
    public void GetDefaultBodyType_SingleType_ReturnsAutomaticSelection(
        string brand,
        string model,
        string expected)
    {
        var result =
            VehicleBodyTypeService.GetDefaultBodyType(
                brand,
                model);

        Assert.Equal(
            expected,
            result);
    }

    [Theory]
    [InlineData("Toyota", "Corolla")]
    [InlineData("Toyota", "Yaris")]
    [InlineData("Hyundai", "Elantra")]
    [InlineData("BMW", "3 Series")]
    [InlineData("Ford", "Mustang")]
    [InlineData("Honda", "Civic")]
    public void GetDefaultBodyType_MultipleTypes_RequiresUserSelection(
        string brand,
        string model)
    {
        var types =
            VehicleBodyTypeService.GetBodyTypes(
                brand,
                model);

        Assert.True(types.Count > 1);

        Assert.Null(
            VehicleBodyTypeService.GetDefaultBodyType(
                brand,
                model));
    }

    // =========================================
    // NORMALIZATION
    // =========================================

    [Theory]
    [InlineData(
        "  jeep  ",
        "  GRAND CHEROKEE  ",
        "SUV")]

    [InlineData(
        "HYUNDAI",
        "tucson",
        "SUV")]

    [InlineData(
        " toyota ",
        " HILUX ",
        "Pickup")]

    [InlineData(
        "kia",
        "picanto",
        "Hatchback")]

    public void GetBodyTypes_NormalizesBrandAndModel(
        string brand,
        string model,
        string expected)
    {
        var types =
            VehicleBodyTypeService.GetBodyTypes(
                brand,
                model);

        Assert.Single(types);

        Assert.Equal(
            expected,
            types[0]);
    }

    // =========================================
    // INVALID BRAND OR MODEL
    // =========================================

    [Theory]
    [InlineData("ImaginaryBrand", "Model X")]
    [InlineData("Toyota", "ImaginaryModel")]
    [InlineData("Hyundai", "Corolla")]
    [InlineData("Jeep", "Elantra")]
    [InlineData("", "Corolla")]
    [InlineData("Toyota", "")]
    [InlineData(null, "Corolla")]
    [InlineData("Toyota", null)]
    [InlineData(null, null)]
    public void GetBodyTypes_InvalidVehicle_ReturnsEmpty(
        string? brand,
        string? model)
    {
        Assert.Empty(
            VehicleBodyTypeService.GetBodyTypes(
                brand,
                model));

        Assert.Null(
            VehicleBodyTypeService.GetDefaultBodyType(
                brand,
                model));
    }

    // =========================================
    // BODY TYPE VALIDATION
    // =========================================

    [Theory]
    [InlineData("Jeep", "Grand Cherokee", "SUV")]
    [InlineData("Jeep", "Grand Cherokee", "suv")]
    [InlineData("Jeep", "Grand Cherokee", " SUV ")]
    [InlineData("Toyota", "Corolla", "Sedan")]
    [InlineData("Toyota", "Corolla", "Hatchback")]
    [InlineData("Toyota", "Corolla", "Wagon")]
    [InlineData("Ford", "Mustang", "Convertible")]
    [InlineData("Toyota", "Hilux", "Pickup")]
    public void IsValidBodyType_ValidSelection_ReturnsTrue(
        string brand,
        string model,
        string bodyType)
    {
        Assert.True(
            VehicleBodyTypeService.IsValidBodyType(
                brand,
                model,
                bodyType));
    }

    [Theory]
    [InlineData("Jeep", "Grand Cherokee", "Sedan")]
    [InlineData("Toyota", "Hilux", "Hatchback")]
    [InlineData("Kia", "Picanto", "Pickup")]
    [InlineData("Hyundai", "Tucson", "Convertible")]
    [InlineData("Toyota", "Corolla", "ImaginaryType")]
    [InlineData("Toyota", "Corolla", "")]
    [InlineData("Toyota", "Corolla", null)]
    [InlineData("FakeBrand", "Corolla", "Sedan")]
    public void IsValidBodyType_InvalidSelection_ReturnsFalse(
        string brand,
        string model,
        string? bodyType)
    {
        Assert.False(
            VehicleBodyTypeService.IsValidBodyType(
                brand,
                model,
                bodyType));
    }

    // =========================================
    // CATALOG INTEGRITY
    // =========================================

    [Fact]
    public void GetSupportedBodyTypes_ReturnsEightUniqueTypes()
    {
        var types =
            VehicleBodyTypeService
                .GetSupportedBodyTypes();

        Assert.Equal(
            8,
            types.Count);

        Assert.Equal(
            types.Count,
            types.Distinct(
                StringComparer.OrdinalIgnoreCase)
                .Count());
    }

    [Fact]
    public void GetModelBodyTypes_ContainsEveryCatalogModel()
    {
        var brands =
            VehicleCatalogService.GetBrands();

        var classifications =
            VehicleBodyTypeService
                .GetModelBodyTypes();

        int expectedModelCount =
            brands.Sum(
                brand => brand.Models.Count);

        Assert.Equal(
            expectedModelCount,
            classifications.Count);

        foreach (var brand in brands)
        {
            foreach (var model in brand.Models)
            {
                Assert.Contains(
                    classifications,
                    item =>
                        item.Brand == brand.Name &&
                        item.Model == model);
            }
        }
    }

    [Fact]
    public void GetModelBodyTypes_NoDuplicateVehicleEntries()
    {
        var classifications =
            VehicleBodyTypeService
                .GetModelBodyTypes();

        var uniqueEntries = classifications
            .Select(
                item =>
                    $"{item.Brand}|{item.Model}")
            .Distinct(
                StringComparer.OrdinalIgnoreCase)
            .ToArray();

        Assert.Equal(
            classifications.Count,
            uniqueEntries.Length);
    }

    [Fact]
    public void GetModelBodyTypes_OnlyContainsSupportedBodyTypes()
    {
        var supportedTypes =
            VehicleBodyTypeService
                .GetSupportedBodyTypes();

        foreach (
            var item in VehicleBodyTypeService
                .GetModelBodyTypes())
        {
            foreach (var type in item.BodyTypes)
            {
                Assert.Contains(
                    type,
                    supportedTypes);
            }
        }
    }

    [Fact]
    public void GetModelBodyTypes_NoDuplicateBodyTypesPerModel()
    {
        foreach (
            var item in VehicleBodyTypeService
                .GetModelBodyTypes())
        {
            Assert.Equal(
                item.BodyTypes.Count,
                item.BodyTypes
                    .Distinct(
                        StringComparer.OrdinalIgnoreCase)
                    .Count());
        }
    }

    [Fact]
    public void GetModelBodyTypes_AllEntriesBelongToVehicleCatalog()
    {
        foreach (
            var item in VehicleBodyTypeService
                .GetModelBodyTypes())
        {
            Assert.True(
                VehicleCatalogService.IsValidBrand(
                    item.Brand));

            Assert.True(
                VehicleCatalogService.IsValidModel(
                    item.Brand,
                    item.Model));
        }
    }

    [Fact]
    public void GetSupportedBodyTypes_AllTypesAreUsed()
    {
        var usedTypes =
            VehicleBodyTypeService
                .GetModelBodyTypes()
                .SelectMany(
                    item => item.BodyTypes)
                .Distinct()
                .ToArray();

        foreach (
            var supportedType in
                VehicleBodyTypeService
                    .GetSupportedBodyTypes())
        {
            Assert.Contains(
                supportedType,
                usedTypes);
        }
    }

    // =========================================
    // DROPDOWN BEHAVIOR
    // =========================================

    [Fact]
    public void SingleBodyType_DoesNotRequireDropdown()
    {
        var types =
            VehicleBodyTypeService.GetBodyTypes(
                "Jeep",
                "Grand Cherokee");

        Assert.Single(types);

        Assert.Equal(
            "SUV",
            VehicleBodyTypeService.GetDefaultBodyType(
                "Jeep",
                "Grand Cherokee"));
    }

    [Fact]
    public void MultipleBodyTypes_RequireDropdown()
    {
        var types =
            VehicleBodyTypeService.GetBodyTypes(
                "Toyota",
                "Corolla");

        Assert.True(types.Count > 1);

        Assert.Null(
            VehicleBodyTypeService.GetDefaultBodyType(
                "Toyota",
                "Corolla"));
    }

    // =========================================
    // CLASSIFICATION COVERAGE REPORT
    // =========================================

    [Fact]
    public void ClassificationCoverage_AtLeast95Percent()
    {
        var classifications =
            VehicleBodyTypeService
                .GetModelBodyTypes();

        int totalModels =
            classifications.Count;

        int classifiedModels =
            classifications.Count(
                item => item.BodyTypes.Count > 0);

        int singleBodyType =
            classifications.Count(
                item => item.BodyTypes.Count == 1);

        int multipleBodyTypes =
            classifications.Count(
                item => item.BodyTypes.Count > 1);

        int unclassifiedModels =
            totalModels - classifiedModels;

        double coverage =
            totalModels == 0
                ? 0
                : (double)classifiedModels /
                  totalModels * 100;

        _output.WriteLine(
            "========================================");

        _output.WriteLine(
            "VEHICLE BODY TYPE COVERAGE REPORT");

        _output.WriteLine(
            "========================================");

        _output.WriteLine(
            $"Total model entries: {totalModels}");

        _output.WriteLine(
            $"Classified models: {classifiedModels}");

        _output.WriteLine(
            $"Single body type: {singleBodyType}");

        _output.WriteLine(
            $"Multiple body types: {multipleBodyTypes}");

        _output.WriteLine(
            $"Unclassified models: {unclassifiedModels}");

        _output.WriteLine(
            $"Classification coverage: {coverage:F2}%");

        foreach (
            var item in classifications.Where(
                item => item.BodyTypes.Count == 0))
        {
            _output.WriteLine(
                $"Unclassified: {item.Brand} {item.Model}");
        }

        _output.WriteLine(
            "----------------------------------------");

        foreach (
            var type in VehicleBodyTypeService
                .GetSupportedBodyTypes())
        {
            int count =
                classifications.Count(
                    item => item.BodyTypes.Contains(type));

            _output.WriteLine(
                $"{type}: {count} model entries");
        }

        _output.WriteLine(
            "========================================");

        Assert.True(
            totalModels > 0,
            "The vehicle catalog must not be empty.");

        Assert.True(
            coverage >= 95,
            $"Classification coverage is only {coverage:F2}%.");
    }
}
