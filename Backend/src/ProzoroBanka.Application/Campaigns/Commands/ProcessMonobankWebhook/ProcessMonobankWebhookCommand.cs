using System.Text.Json.Serialization;
using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.ProcessMonobankWebhook;

/// <summary>
/// Monobank webhook payload. Формат:
/// { "type": "StatementItem", "data": { "account": "...", "statementItem": { ... } } }
/// </summary>
public record ProcessMonobankWebhookCommand(
	MonobankWebhookPayload Payload) : IRequest<ServiceResponse>;

public record MonobankWebhookPayload
{
	[JsonPropertyName("type")]
	public string? Type { get; init; }

	[JsonPropertyName("data")]
	public MonobankWebhookData? Data { get; init; }
}

public record MonobankWebhookData
{
	[JsonPropertyName("account")]
	public string? Account { get; init; }

	[JsonPropertyName("statementItem")]
	public MonobankStatementItem? StatementItem { get; init; }
}

public record MonobankStatementItem
{
	[JsonPropertyName("id")]
	public string? Id { get; init; }

	[JsonPropertyName("time")]
	public long Time { get; init; }

	[JsonPropertyName("description")]
	public string? Description { get; init; }

	[JsonPropertyName("mcc")]
	public int Mcc { get; init; }

	[JsonPropertyName("originalMcc")]
	public int OriginalMcc { get; init; }

	[JsonPropertyName("hold")]
	public bool Hold { get; init; }

	[JsonPropertyName("amount")]
	public long Amount { get; init; }

	[JsonPropertyName("operationAmount")]
	public long OperationAmount { get; init; }

	[JsonPropertyName("currencyCode")]
	public int CurrencyCode { get; init; }

	[JsonPropertyName("commissionRate")]
	public long CommissionRate { get; init; }

	[JsonPropertyName("cashbackAmount")]
	public long CashbackAmount { get; init; }

	[JsonPropertyName("balance")]
	public long Balance { get; init; }

	[JsonPropertyName("comment")]
	public string? Comment { get; init; }

	[JsonPropertyName("receiptId")]
	public string? ReceiptId { get; init; }

	[JsonPropertyName("counterEdrpou")]
	public string? CounterEdrpou { get; init; }

	[JsonPropertyName("counterIban")]
	public string? CounterIban { get; init; }

	[JsonPropertyName("counterName")]
	public string? CounterName { get; init; }
}

public class ProcessMonobankWebhookCommandValidator : AbstractValidator<ProcessMonobankWebhookCommand>
{
	public ProcessMonobankWebhookCommandValidator()
	{
		RuleFor(x => x.Payload).NotNull();
		RuleFor(x => x.Payload.Data).NotNull().When(x => x.Payload is not null);
		RuleFor(x => x.Payload.Data!.Account)
			.NotEmpty().WithMessage("accountId обов'язковий")
			.When(x => x.Payload?.Data is not null);
		RuleFor(x => x.Payload.Data!.StatementItem)
			.NotNull().WithMessage("statementItem обов'язковий")
			.When(x => x.Payload?.Data is not null);
	}
}
