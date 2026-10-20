namespace Campus.Api.Dtos;

// What the AI sends to enroll one face
public class EnrollFaceDto
{
    public float[] Vector { get; set; } = Array.Empty<float>();
    public string ModelName { get; set; } = "ArcFace";
}

// Info about a saved embedding (without the 512 numbers)
public class FaceEmbeddingDto
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public int Dimensions { get; set; }
    public DateTime CreatedAt { get; set; }
}

// What the AI downloads to compare faces against
public class FaceGalleryItemDto
{
    public int EmbeddingId { get; set; }
    public int PersonId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PersonType { get; set; } = string.Empty;
    public float[] Vector { get; set; } = Array.Empty<float>();
}