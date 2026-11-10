using System.ComponentModel.DataAnnotations;
using Campus.Api.Models;

namespace Campus.Api.Dtos;

// What the AI sends after checking a face
public class RecognitionRequestDto
{
    [Range(1, int.MaxValue)]
    public int CameraId { get; set; }

    public int? PersonId { get; set; }            // required when Result = Recognized

    [Range(0.0, 1.0)]
    public float Confidence { get; set; }

    public RecognitionResult Result { get; set; }  // Recognized, Unknown or Spoof

    public DateTime? Timestamp { get; set; }       // when the frame was captured (optional)
}

// What the API answers to the AI
public class RecognitionResponseDto
{
    public int? AttendanceLogId { get; set; }
    public RecognitionResult Result { get; set; }
    public bool Allowed { get; set; }
    public bool Duplicate { get; set; }
    public int? PersonId { get; set; }
    public string? PersonName { get; set; }
    public string? Alert { get; set; }
}

// One attendance record for the dashboard
public class AttendanceLogDto
{
    public int Id { get; set; }
    public DateTime Timestamp { get; set; }
    public int? PersonId { get; set; }
    public string? PersonName { get; set; }
    public PersonType? PersonType { get; set; }
    public int CameraId { get; set; }
    public string CameraName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public float Confidence { get; set; }
    public RecognitionResult Result { get; set; }
}