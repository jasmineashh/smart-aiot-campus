namespace Campus.Api.Services;

public static class VehicleBodyTypeService
{
    public const string Sedan = "Sedan";
    public const string Suv = "SUV";
    public const string Hatchback = "Hatchback";
    public const string Coupe = "Coupe";
    public const string Pickup = "Pickup";
    public const string Van = "Van";
    public const string Wagon = "Wagon";
    public const string Convertible = "Convertible";

    public sealed record VehicleModelBodyTypes(
        string Brand,
        string Model,
        IReadOnlyList<string> BodyTypes
    );

    private static readonly string[] SupportedTypes =
    [
        Sedan,
        Suv,
        Hatchback,
        Coupe,
        Pickup,
        Van,
        Wagon,
        Convertible
    ];

    private static readonly
        Dictionary<string, string[]> Classifications =
        BuildClassifications();

    private static string MakeKey(
        string brand,
        string model)
    {
        return $"{brand}|{model}";
    }

    private static Dictionary<string, string[]>
        BuildClassifications()
    {
        var map = new Dictionary<string, string[]>(
            StringComparer.OrdinalIgnoreCase);

        void Add(
            string brand,
            string bodyType,
            params string[] models)
        {
            foreach (var model in models)
            {
                string key = MakeKey(brand, model);

                if (map.TryGetValue(key, out var existing))
                {
                    map[key] = existing
                        .Append(bodyType)
                        .Distinct()
                        .ToArray();
                }
                else
                {
                    map[key] = [bodyType];
                }
            }
        }

        // =====================================
        // ALFA ROMEO
        // =====================================

        Add("Alfa Romeo", Sedan, "Giulia");
        Add("Alfa Romeo", Hatchback, "Giulietta");
        Add("Alfa Romeo", Suv, "Stelvio", "Tonale");

        // =====================================
        // AUDI
        // =====================================

        Add("Audi", Hatchback, "A1", "A3", "A7");
        Add("Audi", Sedan, "A3", "A4", "A6", "A8");
        Add("Audi", Wagon, "A4", "A6");
        Add("Audi", Coupe, "A5");
        Add("Audi", Hatchback, "A5");
        Add("Audi", Convertible, "A3", "A5");
        Add("Audi", Suv,
            "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron");

        // =====================================
        // BAIC
        // =====================================

        Add("BAIC", Sedan, "U5 Plus");
        Add("BAIC", Suv, "X35", "X55", "X7", "BJ40");

        // =====================================
        // BMW
        // =====================================

        Add("BMW", Sedan,
            "1 Series", "2 Series", "3 Series",
            "5 Series", "7 Series",
            "i5", "i7", "M3", "M5");

        Add("BMW", Hatchback,
            "1 Series", "4 Series", "6 Series",
            "i3", "i4");

        Add("BMW", Coupe,
            "1 Series", "2 Series", "3 Series",
            "4 Series", "6 Series", "8 Series",
            "M2", "M3", "M4");

        Add("BMW", Convertible,
            "1 Series", "2 Series", "3 Series",
            "4 Series", "6 Series", "8 Series",
            "M3", "M4");

        Add("BMW", Wagon,
            "3 Series", "5 Series", "i5", "M3", "M5");

        Add("BMW", Van, "2 Series");

        Add("BMW", Suv,
            "X1", "X2", "X3", "X4", "X5",
            "X6", "X7", "iX", "iX1");

        // =====================================
        // BYD
        // =====================================

        Add("BYD", Sedan,
            "F3", "L3", "Qin Plus", "Seal", "Han");

        Add("BYD", Hatchback, "F0", "Dolphin");

        Add("BYD", Suv,
            "Song Plus", "Atto 3", "Tang");

        // =====================================
        // CHANGAN
        // =====================================

        Add("Changan", Sedan,
            "Alsvin", "Eado", "Eado Plus", "UNI-V");

        Add("Changan", Hatchback, "Eado");

        Add("Changan", Suv,
            "CS15", "CS35", "CS35 Plus",
            "CS55", "CS55 Plus", "CS75 Plus",
            "UNI-T", "UNI-K");

        // =====================================
        // CHERY
        // =====================================

        Add("Chery", Sedan,
            "Arrizo 5", "Arrizo 6");

        Add("Chery", Suv,
            "Tiggo 3", "Tiggo 4", "Tiggo 4 Pro",
            "Tiggo 7", "Tiggo 7 Pro",
            "Tiggo 8", "Tiggo 8 Pro");

        // =====================================
        // CHEVROLET
        // =====================================

        Add("Chevrolet", Sedan,
            "Aveo", "Optra", "Cruze",
            "Lanos", "Malibu");

        Add("Chevrolet", Hatchback,
            "Aveo", "Optra", "Cruze",
            "Lanos", "Spark");

        Add("Chevrolet", Wagon, "Optra", "Cruze");

        Add("Chevrolet", Suv,
            "Captiva", "Equinox", "Trailblazer",
            "Tahoe", "Suburban");

        // =====================================
        // CITROEN
        // =====================================

        Add("Citroën", Hatchback, "C3", "C4");
        Add("Citroën", Sedan, "C4", "C5", "C-Elysée");
        Add("Citroën", Wagon, "C5");
        Add("Citroën", Suv, "C3 Aircross", "C5 Aircross");
        Add("Citroën", Van, "Berlingo");

        // =====================================
        // DAEWOO
        // =====================================

        Add("Daewoo", Sedan,
            "Lanos", "Nubira", "Leganza");

        Add("Daewoo", Hatchback,
            "Lanos", "Nubira", "Matiz");

        Add("Daewoo", Wagon, "Nubira");

        // =====================================
        // DAIHATSU
        // =====================================

        Add("Daihatsu", Suv, "Terios");

        Add("Daihatsu", Hatchback,
            "Sirion", "Mira", "Charade");

        Add("Daihatsu", Sedan, "Charade");

        // =====================================
        // DFSK
        // =====================================

        Add("DFSK", Van, "Glory 330");

        Add("DFSK", Suv,
            "Glory 500", "Glory 580", "Glory 600");

        // =====================================
        // DONGFENG
        // =====================================

        Add("Dongfeng", Sedan, "Shine", "Shine Max");
        Add("Dongfeng", Suv, "Mage", "Huge", "AX7");
        Add("Dongfeng", Pickup, "Rich 6");

        // =====================================
        // FIAT
        // =====================================

        Add("Fiat", Sedan,
            "128", "131", "132", "Linea", "Tipo");

        Add("Fiat", Hatchback,
            "Uno", "Punto", "Grande Punto",
            "Tipo", "500", "Panda");

        Add("Fiat", Wagon, "128", "131", "Tipo");
        Add("Fiat", Coupe, "128");
        Add("Fiat", Convertible, "500");
        Add("Fiat", Suv, "500X");
        Add("Fiat", Van, "Doblo");

        // =====================================
        // FORD
        // =====================================

        Add("Ford", Sedan,
            "Fiesta", "Focus", "Fusion", "Mondeo");

        Add("Ford", Hatchback,
            "Fiesta", "Focus", "Fusion", "Mondeo");

        Add("Ford", Wagon, "Focus", "Mondeo");

        Add("Ford", Suv,
            "EcoSport", "Escape", "Kuga",
            "Edge", "Explorer", "Expedition");

        Add("Ford", Coupe, "Mustang");
        Add("Ford", Convertible, "Mustang");
        Add("Ford", Pickup, "Ranger");

        // =====================================
        // GAC
        // =====================================

        Add("GAC", Sedan, "Empow");

        Add("GAC", Suv,
            "Emkoo", "GS3", "GS4", "GS8", "Emzoom");

        // =====================================
        // GEELY
        // =====================================

        Add("Geely", Sedan, "Emgrand", "Emgrand 7");

        Add("Geely", Hatchback, "Emgrand 7");

        Add("Geely", Suv,
            "Coolray", "Azkarra", "Okavango",
            "Tugella", "Geometry C",
            "Starray", "GX3 Pro");

        // =====================================
        // GREAT WALL
        // =====================================

        Add("Great Wall", Pickup,
            "Wingle 5", "Wingle 7", "Poer");

        // =====================================
        // HAVAL
        // =====================================

        Add("Haval", Suv,
            "H2", "H6", "H9", "Jolion", "Dargo");

        // =====================================
        // HONDA
        // =====================================

        Add("Honda", Sedan, "Civic", "City", "Accord");

        Add("Honda", Hatchback,
            "Civic", "City", "Jazz");

        Add("Honda", Coupe, "Civic", "Accord");

        Add("Honda", Wagon, "Civic", "Accord");

        Add("Honda", Suv,
            "CR-V", "HR-V", "Pilot", "BR-V");

        // =====================================
        // HYUNDAI
        // =====================================

        Add("Hyundai", Sedan,
            "Accent", "Accent RB", "Verna",
            "Elantra", "Elantra HD",
            "Elantra AD", "Elantra CN7",
            "Sonata", "Azera", "Ioniq 6");

        Add("Hyundai", Hatchback,
            "Accent", "Verna", "Elantra",
            "i10", "Grand i10", "i20",
            "i30", "Getz", "Atos");

        Add("Hyundai", Wagon, "Elantra", "i30");
        Add("Hyundai", Coupe, "Elantra", "i30");
        Add("Hyundai", Van, "Matrix");

        Add("Hyundai", Suv,
            "Creta", "Tucson", "Santa Fe",
            "Palisade", "Kona", "Bayon",
            "Venue", "Ioniq 5");

        // =====================================
        // INFINITI
        // =====================================

        Add("Infiniti", Sedan, "Q50");
        Add("Infiniti", Hatchback, "Q30");
        Add("Infiniti", Coupe, "Q60");
        Add("Infiniti", Convertible, "Q60");

        Add("Infiniti", Suv,
            "QX30", "QX50", "QX60", "QX80");

        // =====================================
        // ISUZU
        // =====================================

        Add("Isuzu", Pickup, "D-Max");
        Add("Isuzu", Suv, "MU-X");

        // =====================================
        // JAC
        // =====================================

        Add("JAC", Sedan, "J3", "J5", "J7");
        Add("JAC", Hatchback, "J3", "J7");

        Add("JAC", Suv,
            "S2", "S3", "S4", "S5",
            "JS2", "JS3", "JS4", "JS6");

        // =====================================
        // JAGUAR
        // =====================================

        Add("Jaguar", Sedan, "XE", "XF", "XJ");
        Add("Jaguar", Wagon, "XF");
        Add("Jaguar", Coupe, "F-Type");
        Add("Jaguar", Convertible, "F-Type");
        Add("Jaguar", Suv, "E-Pace", "F-Pace", "I-Pace");

        // =====================================
        // JEEP
        // =====================================

        Add("Jeep", Suv,
            "Renegade", "Compass", "Cherokee",
            "Grand Cherokee", "Wrangler");

        Add("Jeep", Pickup, "Gladiator");

        // =====================================
        // JETOUR
        // =====================================

        Add("Jetour", Suv,
            "X70", "X70 Plus", "X90 Plus",
            "Dashing", "T2", "X50");

        // =====================================
        // KIA
        // =====================================

        Add("Kia", Sedan,
            "Rio", "Cerato", "Grand Cerato",
            "K3", "K5", "Optima");

        Add("Kia", Hatchback,
            "Picanto", "Rio", "Cerato", "K3");

        Add("Kia", Coupe, "Cerato");
        Add("Kia", Wagon, "Optima");

        Add("Kia", Suv,
            "Sportage", "Sorento", "Seltos",
            "Sonet", "Soul", "EV6", "EV9");

        Add("Kia", Van, "Carnival", "Carens");

        // =====================================
        // LADA
        // =====================================

        Add("Lada", Sedan,
            "2105", "2107", "Granta", "Vesta");

        Add("Lada", Hatchback, "Granta");
        Add("Lada", Wagon, "Granta", "Vesta");
        Add("Lada", Suv, "Niva");

        // =====================================
        // LAND ROVER
        // =====================================

        Add("Land Rover", Suv,
            "Defender", "Discovery",
            "Discovery Sport", "Freelander",
            "Range Rover", "Range Rover Sport",
            "Range Rover Evoque", "Range Rover Velar");

        Add("Land Rover", Pickup, "Defender");
        Add("Land Rover", Convertible,
            "Range Rover Evoque");

        // =====================================
        // LEXUS
        // =====================================

        Add("Lexus", Sedan, "IS", "ES", "GS", "LS");
        Add("Lexus", Convertible, "IS");
        Add("Lexus", Wagon, "IS");
        Add("Lexus", Suv, "UX", "NX", "RX", "GX", "LX");

        // =====================================
        // MAZDA
        // =====================================

        Add("Mazda", Sedan,
            "Mazda 2", "Mazda 3", "Mazda 6");

        Add("Mazda", Hatchback,
            "Mazda 2", "Mazda 3", "Mazda 6");

        Add("Mazda", Wagon, "Mazda 6");

        Add("Mazda", Suv,
            "CX-3", "CX-5", "CX-30",
            "CX-60", "CX-90");

        Add("Mazda", Convertible, "MX-5");

        // =====================================
        // MERCEDES-BENZ
        // =====================================

        Add("Mercedes-Benz", Sedan,
            "A-Class", "C-Class", "E-Class",
            "S-Class", "CLA", "CLS", "EQE", "EQS");

        Add("Mercedes-Benz", Hatchback, "A-Class");
        Add("Mercedes-Benz", Van, "B-Class", "V-Class");

        Add("Mercedes-Benz", Coupe,
            "C-Class", "E-Class", "S-Class", "AMG GT");

        Add("Mercedes-Benz", Convertible,
            "C-Class", "E-Class", "S-Class", "AMG GT");

        Add("Mercedes-Benz", Wagon,
            "C-Class", "E-Class", "CLA", "CLS");

        Add("Mercedes-Benz", Suv,
            "GLA", "GLB", "GLC", "GLE", "GLS",
            "G-Class", "EQA", "EQB", "EQE", "EQS");

        // =====================================
        // MG
        // =====================================

        Add("MG", Sedan, "MG 5", "MG 6", "MG 7");
        Add("MG", Hatchback, "MG 3", "MG 4", "MG 5");
        Add("MG", Wagon, "MG 5");

        Add("MG", Suv,
            "ZS", "ZS EV", "HS",
            "RX5", "RX8", "ONE");

        Add("MG", Convertible, "Cyberster");

        // =====================================
        // MINI
        // =====================================

        Add("MINI", Hatchback, "Cooper", "Cooper S");
        Add("MINI", Convertible, "Cooper", "Cooper S");
        Add("MINI", Wagon, "Clubman");
        Add("MINI", Suv,
            "Countryman", "Paceman", "Aceman");

        // =====================================
        // MITSUBISHI
        // =====================================

        Add("Mitsubishi", Sedan,
            "Lancer", "Lancer EX", "Attrage", "Mirage");

        Add("Mitsubishi", Hatchback, "Lancer", "Mirage");
        Add("Mitsubishi", Wagon, "Lancer");
        Add("Mitsubishi", Coupe, "Lancer");

        Add("Mitsubishi", Suv,
            "ASX", "Eclipse Cross",
            "Outlander", "Pajero");

        Add("Mitsubishi", Van, "Xpander");
        Add("Mitsubishi", Pickup, "L200");

        // =====================================
        // NISSAN
        // =====================================

        Add("Nissan", Sedan,
            "Sunny", "Sentra", "Tiida",
            "Altima", "Maxima");

        Add("Nissan", Hatchback,
            "Sunny", "Tiida", "Micra", "Leaf");

        Add("Nissan", Coupe, "Altima");

        Add("Nissan", Suv,
            "Juke", "Qashqai", "X-Trail",
            "Kicks", "Patrol", "Pathfinder");

        Add("Nissan", Pickup, "Navara", "Patrol");

        // =====================================
        // OPEL
        // =====================================

        Add("Opel", Sedan,
            "Corsa", "Astra", "Vectra", "Insignia");

        Add("Opel", Hatchback,
            "Corsa", "Astra", "Vectra", "Insignia");

        Add("Opel", Wagon,
            "Corsa", "Astra", "Vectra", "Insignia");

        Add("Opel", Coupe, "Astra");
        Add("Opel", Convertible, "Astra");
        Add("Opel", Suv, "Mokka", "Crossland", "Grandland");
        Add("Opel", Van, "Meriva", "Zafira");

        // =====================================
        // PEUGEOT
        // =====================================

        Add("Peugeot", Sedan,
            "206", "207", "301", "306",
            "307", "405", "406", "407", "508");

        Add("Peugeot", Hatchback,
            "206", "207", "208", "306",
            "307", "308", "508");

        Add("Peugeot", Wagon,
            "206", "207", "306", "307",
            "308", "405", "406", "407", "508");

        Add("Peugeot", Convertible,
            "206", "207", "306", "307", "308");

        Add("Peugeot", Coupe, "406", "407");
        Add("Peugeot", Suv, "2008", "3008", "5008");
        Add("Peugeot", Van, "Partner", "Rifter", "5008");

        // =====================================
        // PORSCHE
        // =====================================

        Add("Porsche", Coupe, "911", "718 Cayman");

        Add("Porsche", Convertible,
            "911", "718 Boxster");

        Add("Porsche", Sedan, "Taycan");
        Add("Porsche", Hatchback, "Panamera");
        Add("Porsche", Wagon, "Panamera", "Taycan");
        Add("Porsche", Suv, "Macan", "Cayenne");

        // =====================================
        // PROTON
        // =====================================

        Add("Proton", Sedan,
            "Saga", "Persona", "Waja");

        Add("Proton", Hatchback, "Saga", "Gen-2");
        Add("Proton", Suv, "X50", "X70", "X90");

        // =====================================
        // RENAULT
        // =====================================

        Add("Renault", Sedan,
            "Logan", "Clio", "Megane",
            "Fluence", "Symbol", "Talisman");

        Add("Renault", Hatchback,
            "Sandero", "Stepway", "Clio", "Megane");

        Add("Renault", Wagon,
            "Logan", "Clio", "Megane", "Talisman");

        Add("Renault", Coupe, "Megane");
        Add("Renault", Convertible, "Megane");

        Add("Renault", Suv,
            "Duster", "Captur", "Kadjar",
            "Koleos", "Austral");

        Add("Renault", Van, "Scenic");

        // =====================================
        // SEAT
        // =====================================

        Add("SEAT", Hatchback, "Ibiza", "Leon", "Toledo");
        Add("SEAT", Sedan, "Toledo");
        Add("SEAT", Wagon, "Ibiza", "Leon");
        Add("SEAT", Suv, "Arona", "Ateca", "Tarraco");

        // =====================================
        // SKODA
        // =====================================

        Add("Skoda", Hatchback,
            "Fabia", "Octavia",
            "Superb", "Rapid", "Scala");

        Add("Skoda", Sedan, "Fabia", "Rapid", "Superb");

        Add("Skoda", Wagon,
            "Fabia", "Octavia", "Superb");

        Add("Skoda", Suv,
            "Kamiq", "Karoq", "Kodiaq", "Enyaq");

        // =====================================
        // SUBARU
        // =====================================

        Add("Subaru", Sedan,
            "Impreza", "Legacy", "WRX");

        Add("Subaru", Hatchback, "Impreza", "WRX");
        Add("Subaru", Wagon, "Impreza", "Legacy", "WRX");

        Add("Subaru", Suv,
            "XV", "Crosstrek", "Forester", "Outback");

        Add("Subaru", Coupe, "BRZ");

        // =====================================
        // SUZUKI
        // =====================================

        Add("Suzuki", Hatchback,
            "Alto", "Celerio", "Swift",
            "Baleno", "S-Presso");

        Add("Suzuki", Sedan,
            "Swift", "Dzire", "Ciaz", "Baleno");

        Add("Suzuki", Wagon, "Baleno");
        Add("Suzuki", Van, "Ertiga");
        Add("Suzuki", Suv, "Vitara", "Grand Vitara", "Jimny");

        // =====================================
        // TESLA
        // =====================================

        Add("Tesla", Sedan, "Model 3");
        Add("Tesla", Hatchback, "Model S");
        Add("Tesla", Suv, "Model X", "Model Y");

        // =====================================
        // TOYOTA
        // =====================================

        Add("Toyota", Sedan,
            "Corolla", "Yaris", "Belta",
            "Camry", "Avalon", "Prius");

        Add("Toyota", Hatchback,
            "Corolla", "Yaris", "Prius");

        Add("Toyota", Wagon, "Corolla", "Camry");

        Add("Toyota", Suv,
            "C-HR", "Corolla Cross",
            "RAV4", "Rush", "Fortuner",
            "Prado", "Land Cruiser");

        Add("Toyota", Pickup, "Hilux", "Land Cruiser");
        Add("Toyota", Van, "Avanza", "Innova", "Hiace");
        Add("Toyota", Coupe, "Supra");

        // =====================================
        // VOLKSWAGEN
        // =====================================

        Add("Volkswagen", Sedan,
            "Polo", "Jetta", "Passat", "Bora");

        Add("Volkswagen", Hatchback,
            "Polo", "Golf", "Beetle", "ID.3");

        Add("Volkswagen", Wagon,
            "Polo", "Golf", "Jetta", "Passat", "Bora");

        Add("Volkswagen", Coupe, "Scirocco");

        Add("Volkswagen", Convertible,
            "Golf", "Beetle", "T-Roc");

        Add("Volkswagen", Suv,
            "T-Cross", "T-Roc", "Tiguan",
            "Touareg", "Teramont", "ID.4", "ID.6");

        // =====================================
        // VOLVO
        // =====================================

        Add("Volvo", Sedan, "S40", "S60", "S80", "S90");
        Add("Volvo", Hatchback, "V40");
        Add("Volvo", Wagon, "V40", "V60", "V90");

        Add("Volvo", Suv,
            "XC40", "XC60", "XC90", "EX30", "EX90");

        // =====================================
        // ZOTYE
        // =====================================

        Add("Zotye", Hatchback, "Z100");
        Add("Zotye", Sedan, "Z300");
        Add("Zotye", Suv, "T300", "T600", "T700");

        return map;
    }

    // =========================================
    // PUBLIC METHODS
    // =========================================

    public static IReadOnlyList<string>
        GetSupportedBodyTypes()
    {
        return SupportedTypes.ToArray();
    }

    public static IReadOnlyList<string>
        GetBodyTypes(string? brand, string? model)
    {
        string? normalizedBrand =
            VehicleCatalogService.NormalizeBrand(brand);

        string? normalizedModel =
            VehicleCatalogService.NormalizeModel(
                normalizedBrand,
                model);

        if (normalizedBrand is null ||
            normalizedModel is null)
        {
            return Array.Empty<string>();
        }

        string key = MakeKey(
            normalizedBrand,
            normalizedModel);

        return Classifications.TryGetValue(
            key, out var types)
                ? types.ToArray()
                : Array.Empty<string>();
    }

    public static bool IsValidBodyType(
        string? brand,
        string? model,
        string? bodyType)
    {
        if (string.IsNullOrWhiteSpace(bodyType))
        {
            return false;
        }

        return GetBodyTypes(brand, model).Contains(
            bodyType.Trim(),
            StringComparer.OrdinalIgnoreCase);
    }

    public static string? GetDefaultBodyType(
        string? brand,
        string? model)
    {
        var types = GetBodyTypes(brand, model);

        // Automatically select only when there
        // is exactly one classified body type.

        return types.Count == 1
            ? types[0]
            : null;
    }

    public static IReadOnlyList<VehicleModelBodyTypes>
        GetModelBodyTypes()
    {
        return VehicleCatalogService.GetBrands()
            .SelectMany(brand =>
                brand.Models.Select(model =>
                    new VehicleModelBodyTypes(
                        brand.Name,
                        model,
                        GetBodyTypes(
                            brand.Name,
                            model))))
            .ToArray();
    }
}
