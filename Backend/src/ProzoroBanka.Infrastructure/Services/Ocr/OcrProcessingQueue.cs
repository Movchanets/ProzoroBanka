using System.Threading.Channels;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Ocr;

/// <summary>
/// In-process OCR work queue backed by an unbounded Channel.
/// Registered as singleton; consumed by <see cref="OcrBackgroundWorker"/>.
/// </summary>
public class OcrProcessingQueue : IOcrProcessingQueue
{
	private readonly Channel<OcrWorkItem> _channel =
		Channel.CreateUnbounded<OcrWorkItem>(new UnboundedChannelOptions
		{
			SingleReader = false,
			SingleWriter = false,
		});

	public ValueTask EnqueueAsync(OcrWorkItem item, CancellationToken ct = default)
		=> _channel.Writer.WriteAsync(item, ct);

	public IAsyncEnumerable<OcrWorkItem> ReadAllAsync(CancellationToken ct)
		=> _channel.Reader.ReadAllAsync(ct);
}
