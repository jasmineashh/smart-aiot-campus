namespace Campus.Api.Services;

public static class VehicleCatalogService
{
    public sealed record VehicleBrand(
        string Name,
        IReadOnlyList<string> Models
    );

    public sealed record VehicleColor(
        string Name,
        string Hex
    );

    private static readonly Dictionary<string, string[]> Catalog =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Alfa Romeo"] =
            [
                "Giulia", "Giulietta", "Stelvio", "Tonale"
            ],

            ["Audi"] =
            [
                "A1", "A3", "A4", "A5", "A6", "A7", "A8",
                "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron"
            ],

            ["BAIC"] =
            [
                "U5 Plus", "X35", "X55", "X7", "BJ40"
            ],

            ["BMW"] =
            [
                "1 Series", "2 Series", "3 Series",
                "4 Series", "5 Series", "6 Series",
                "7 Series", "8 Series",
                "X1", "X2", "X3", "X4", "X5", "X6", "X7",
                "i3", "i4", "i5", "i7", "iX", "iX1",
                "M2", "M3", "M4", "M5"
            ],

            ["BYD"] =
            [
                "F3", "F0", "L3", "Qin Plus",
                "Song Plus", "Atto 3", "Dolphin",
                "Seal", "Han", "Tang"
            ],

            ["Changan"] =
            [
                "Alsvin", "Eado", "Eado Plus",
                "CS15", "CS35", "CS35 Plus",
                "CS55", "CS55 Plus", "CS75 Plus",
                "UNI-T", "UNI-K", "UNI-V"
            ],

            ["Chery"] =
            [
                "Arrizo 5", "Arrizo 6",
                "Tiggo 3", "Tiggo 4", "Tiggo 4 Pro",
                "Tiggo 7", "Tiggo 7 Pro",
                "Tiggo 8", "Tiggo 8 Pro"
            ],

            ["Chevrolet"] =
            [
                "Aveo", "Optra", "Cruze",
                "Lanos", "Spark", "Malibu",
                "Captiva", "Equinox", "Trailblazer",
                "Tahoe", "Suburban"
            ],

            ["Citroën"] =
            [
                "C3", "C4", "C5", "C-Elysée",
                "C3 Aircross", "C5 Aircross",
                "Berlingo"
            ],

            ["Daewoo"] =
            [
                "Lanos", "Nubira", "Leganza", "Matiz"
            ],

            ["Daihatsu"] =
            [
                "Terios", "Sirion", "Mira", "Charade"
            ],

            ["DFSK"] =
            [
                "Glory 330", "Glory 500",
                "Glory 580", "Glory 600"
            ],

            ["Dongfeng"] =
            [
                "Shine", "Shine Max", "Mage", "Huge",
                "AX7", "Rich 6"
            ],

            ["Fiat"] =
            [
                "128", "131", "132", "Uno", "Punto",
                "Grande Punto", "Linea", "Tipo",
                "500", "500X", "Panda", "Doblo"
            ],

            ["Ford"] =
            [
                "Fiesta", "Focus", "Fusion", "Mondeo",
                "EcoSport", "Escape", "Kuga",
                "Edge", "Explorer", "Mustang",
                "Ranger", "Expedition"
            ],

            ["GAC"] =
            [
                "Empow", "Emkoo", "GS3",
                "GS4", "GS8", "Emzoom"
            ],

            ["Geely"] =
            [
                "Emgrand", "Emgrand 7",
                "Coolray", "Azkarra", "Okavango",
                "Tugella", "Geometry C",
                "Starray", "GX3 Pro"
            ],

            ["Great Wall"] =
            [
                "Wingle 5", "Wingle 7", "Poer"
            ],

            ["Haval"] =
            [
                "H2", "H6", "H9", "Jolion",
                "Dargo"
            ],

            ["Honda"] =
            [
                "Civic", "City", "Accord", "Jazz",
                "CR-V", "HR-V", "Pilot", "BR-V"
            ],

            ["Hyundai"] =
            [
                "Accent", "Accent RB", "Verna",
                "Elantra", "Elantra HD", "Elantra AD",
                "Elantra CN7", "Sonata", "Azera",
                "i10", "Grand i10", "i20", "i30",
                "Getz", "Matrix", "Atos",
                "Creta", "Tucson", "Santa Fe",
                "Palisade", "Kona", "Bayon",
                "Venue", "Ioniq 5", "Ioniq 6"
            ],

            ["Infiniti"] =
            [
                "Q30", "Q50", "Q60",
                "QX30", "QX50", "QX60", "QX80"
            ],

            ["Isuzu"] =
            [
                "D-Max", "MU-X"
            ],

            ["JAC"] =
            [
                "J3", "J5", "J7", "S2", "S3",
                "S4", "S5", "JS2", "JS3", "JS4",
                "JS6"
            ],

            ["Jaguar"] =
            [
                "XE", "XF", "XJ", "F-Type",
                "E-Pace", "F-Pace", "I-Pace"
            ],

            ["Jeep"] =
            [
                "Renegade", "Compass", "Cherokee",
                "Grand Cherokee", "Wrangler",
                "Gladiator"
            ],

            ["Jetour"] =
            [
                "X70", "X70 Plus", "X90 Plus",
                "Dashing", "T2", "X50"
            ],

            ["Kia"] =
            [
                "Picanto", "Rio", "Cerato",
                "Grand Cerato", "K3", "K5",
                "Optima", "Sportage", "Sorento",
                "Seltos", "Sonet", "Soul",
                "Carnival", "Carens", "EV6", "EV9"
            ],

            ["Lada"] =
            [
                "2105", "2107", "Granta",
                "Vesta", "Niva"
            ],

            ["Land Rover"] =
            [
                "Defender", "Discovery",
                "Discovery Sport", "Freelander",
                "Range Rover", "Range Rover Sport",
                "Range Rover Evoque", "Range Rover Velar"
            ],

            ["Lexus"] =
            [
                "IS", "ES", "GS", "LS", "UX",
                "NX", "RX", "GX", "LX"
            ],

            ["Mazda"] =
            [
                "Mazda 2", "Mazda 3", "Mazda 6",
                "CX-3", "CX-5", "CX-30",
                "CX-60", "CX-90", "MX-5"
            ],

            ["Mercedes-Benz"] =
            [
                "A-Class", "B-Class", "C-Class",
                "E-Class", "S-Class", "CLA", "CLS",
                "GLA", "GLB", "GLC", "GLE", "GLS",
                "G-Class", "V-Class",
                "EQA", "EQB", "EQE", "EQS",
                "AMG GT"
            ],

            ["MG"] =
            [
                "MG 3", "MG 4", "MG 5", "MG 6",
                "MG 7", "ZS", "ZS EV",
                "HS", "RX5", "RX8", "ONE",
                "Cyberster"
            ],

            ["MINI"] =
            [
                "Cooper", "Cooper S", "Clubman",
                "Countryman", "Paceman", "Aceman"
            ],

            ["Mitsubishi"] =
            [
                "Lancer", "Lancer EX", "Attrage",
                "Mirage", "ASX", "Eclipse Cross",
                "Outlander", "Pajero", "Xpander",
                "L200"
            ],

            ["Nissan"] =
            [
                "Sunny", "Sentra", "Tiida",
                "Micra", "Juke", "Qashqai",
                "X-Trail", "Kicks", "Patrol",
                "Pathfinder", "Navara", "Altima",
                "Maxima", "Leaf"
            ],

            ["Opel"] =
            [
                "Corsa", "Astra", "Vectra",
                "Insignia", "Mokka", "Crossland",
                "Grandland", "Meriva", "Zafira"
            ],

            ["Peugeot"] =
            [
                "206", "207", "208", "301",
                "306", "307", "308", "405",
                "406", "407", "508",
                "2008", "3008", "5008",
                "Partner", "Rifter"
            ],

            ["Porsche"] =
            [
                "911", "718 Cayman", "718 Boxster",
                "Panamera", "Macan", "Cayenne",
                "Taycan"
            ],

            ["Proton"] =
            [
                "Saga", "Persona", "Gen-2",
                "Waja", "X50", "X70", "X90"
            ],

            ["Renault"] =
            [
                "Logan", "Sandero", "Stepway",
                "Clio", "Megane", "Fluence",
                "Symbol", "Duster", "Captur",
                "Kadjar", "Koleos", "Austral",
                "Scenic", "Talisman"
            ],

            ["SEAT"] =
            [
                "Ibiza", "Leon", "Toledo",
                "Arona", "Ateca", "Tarraco"
            ],

            ["Skoda"] =
            [
                "Fabia", "Octavia", "Superb",
                "Rapid", "Scala", "Kamiq",
                "Karoq", "Kodiaq", "Enyaq"
            ],

            ["Subaru"] =
            [
                "Impreza", "Legacy", "XV",
                "Crosstrek", "Forester",
                "Outback", "WRX", "BRZ"
            ],

            ["Suzuki"] =
            [
                "Alto", "Celerio", "Swift",
                "Dzire", "Ciaz", "Baleno",
                "S-Presso", "Ertiga",
                "Vitara", "Grand Vitara", "Jimny"
            ],

            ["Tesla"] =
            [
                "Model 3", "Model S",
                "Model X", "Model Y"
            ],

            ["Toyota"] =
            [
                "Corolla", "Yaris", "Bel ta".Replace(" ", ""),
                "Camry", "Avalon", "C-HR",
                "Corolla Cross", "RAV4",
                "Rush", "Fortuner", "Prado",
                "Land Cruiser", "Hilux",
                "Avanza", "Innova", "Hiace",
                "Prius", "Supra"
            ],

            ["Volkswagen"] =
            [
                "Polo", "Golf", "Jetta", "Passat",
                "Bora", "Beetle", "Scirocco",
                "T-Cross", "T-Roc", "Tiguan",
                "Touareg", "Teramont",
                "ID.3", "ID.4", "ID.6"
            ],

            ["Volvo"] =
            [
                "S40", "S60", "S80", "S90",
                "V40", "V60", "V90",
                "XC40", "XC60", "XC90",
                "EX30", "EX90"
            ],

            ["Zotye"] =
            [
                "Z100", "Z300", "T300",
                "T600", "T700"
            ]
        };

    private static readonly VehicleColor[] Colors =
    [
        new("White", "#FFFFFF"),
        new("Black", "#202124"),
        new("Silver", "#BFC5CC"),
        new("Grey", "#737B85"),
        new("Blue", "#2457AA"),
        new("Red", "#C42F35"),
        new("Brown", "#795548"),
        new("Beige", "#D4C2A2"),
        new("Green", "#38834A"),
        new("Orange", "#E88732"),
        new("Yellow", "#E4C23D"),
        new("Gold", "#C4A35A"),
        new("Purple", "#7952A0"),
        new("Burgundy", "#800020"),
        new("Bronze", "#CD7F32")
    ];

    public static IReadOnlyList<VehicleBrand> GetBrands()
    {
        return Catalog
            .OrderBy(
                item => item.Key,
                StringComparer.OrdinalIgnoreCase)
            .Select(item => new VehicleBrand(
                item.Key,
                item.Value
                    .OrderBy(
                        model => model,
                        StringComparer.OrdinalIgnoreCase)
                    .ToArray()
            ))
            .ToArray();
    }

    public static IReadOnlyList<VehicleColor> GetColors()
    {
        return Colors.ToArray();
    }

    public static string? NormalizeBrand(string? brand)
    {
        if (string.IsNullOrWhiteSpace(brand))
        {
            return null;
        }

        return Catalog.Keys.FirstOrDefault(
            name => string.Equals(
                name,
                brand.Trim(),
                StringComparison.OrdinalIgnoreCase));
    }

    public static string? NormalizeModel(
        string? brand,
        string? model)
    {
        string? normalizedBrand =
            NormalizeBrand(brand);

        if (normalizedBrand is null ||
            string.IsNullOrWhiteSpace(model))
        {
            return null;
        }

        return Catalog[normalizedBrand]
            .FirstOrDefault(name => string.Equals(
                name,
                model.Trim(),
                StringComparison.OrdinalIgnoreCase));
    }

    public static string? NormalizeColor(string? color)
    {
        if (string.IsNullOrWhiteSpace(color))
        {
            return null;
        }

        string candidate = color.Trim();

        // Accept the common alternative spelling.
        if (string.Equals(
            candidate,
            "Gray",
            StringComparison.OrdinalIgnoreCase))
        {
            candidate = "Grey";
        }

        return Colors.FirstOrDefault(item =>
            string.Equals(
                item.Name,
                candidate,
                StringComparison.OrdinalIgnoreCase))
            ?.Name;
    }

    public static bool IsValidBrand(string? brand)
    {
        return NormalizeBrand(brand) is not null;
    }

    public static bool IsValidModel(
        string? brand,
        string? model)
    {
        return NormalizeModel(brand, model) is not null;
    }

    public static bool IsValidColor(string? color)
    {
        return NormalizeColor(color) is not null;
    }

    public static bool TryValidateVehicle(
        string? brand,
        string? model,
        string? color,
        out string normalizedBrand,
        out string normalizedModel,
        out string normalizedColor,
        out string error)
    {
        normalizedBrand = string.Empty;
        normalizedModel = string.Empty;
        normalizedColor = string.Empty;
        error = string.Empty;

        string? validBrand = NormalizeBrand(brand);

        if (validBrand is null)
        {
            error =
                "Select a valid car brand from the vehicle catalog.";

            return false;
        }

        string? validModel =
            NormalizeModel(validBrand, model);

        if (validModel is null)
        {
            error =
                "Select a valid model for the chosen car brand.";

            return false;
        }

        string? validColor = NormalizeColor(color);

        if (validColor is null)
        {
            error =
                "Select a valid vehicle color from the catalog.";

            return false;
        }

        normalizedBrand = validBrand;
        normalizedModel = validModel;
        normalizedColor = validColor;

        return true;
    }
}
