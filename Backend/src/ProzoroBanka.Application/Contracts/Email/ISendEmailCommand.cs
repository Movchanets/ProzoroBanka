namespace ProzoroBanka.Application.Contracts.Email;

public interface ISendEmailCommand
{
	Guid MessageId { get; }
	string To { get; }
	string Subject { get; }
	string Body { get; }
	bool IsHtml { get; }
	string? From { get; }
	IEnumerable<string>? Cc { get; }
	IEnumerable<string>? Bcc { get; }
	IEnumerable<IEmailAttachment>? Attachments { get; }
	DateTime RequestedAt { get; }
	string? CorrelationId { get; }
}

public interface IEmailAttachment
{
	string FileName { get; }
	byte[] Content { get; }
	string ContentType { get; }
}