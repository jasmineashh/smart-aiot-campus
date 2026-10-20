namespace Campus.Api.Models;

public class FaceEmbedding
{
    public int Id { get; set; }
    public int PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public float[] Vector { get; set; } = Array.Empty<float>(); // e.g. 512 numbers from ArcFace
    public string ModelName { get; set; } = "ArcFace";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}