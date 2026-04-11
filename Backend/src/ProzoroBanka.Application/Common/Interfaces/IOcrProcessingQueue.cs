namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Abstraction for the OCR background processing queue.
/// Implementations enqueue work items that are later consumed by a background worker.
/// </summary>
public interface IOcrProcessingQueue
{
	ValueTask EnqueueAsync(OcrWorkItem item, CancellationToken ct = default);
}

/// <summary>
/// Represents a single OCR extraction request to be processed in the background.
/// </summary>
public record OcrWorkItem(
	Guid ReceiptId,
	Guid OrganizationId,
	Guid CallerUserId,
	string? ModelIdentifier);
