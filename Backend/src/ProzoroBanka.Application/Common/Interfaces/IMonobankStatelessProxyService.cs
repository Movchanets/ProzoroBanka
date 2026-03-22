using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Stateless proxy до Monobank API. Токен передається per-request і ніколи не зберігається.
/// </summary>
public interface IMonobankStatelessProxyService
{
	/// <summary>
	/// Отримує інфо про клієнта і повертає список банок (jars) + рахунків.
	/// </summary>
	Task<ServiceResponse<MonobankClientInfoDto>> GetClientInfoAsync(string token, CancellationToken ct);

	/// <summary>
	/// Реєструє webhook URL в Monobank.
	/// </summary>
	Task<ServiceResponse> RegisterWebhookAsync(string token, string webhookUrl, CancellationToken ct);
}

public record MonobankJarDto(
	string Id,
	string? SendId,
	string Title,
	string? Description,
	int CurrencyCode,
	long Balance,
	long? Goal);

public record MonobankAccountDto(
	string Id,
	string? SendId,
	long Balance,
	long CreditLimit,
	string Type,
	int CurrencyCode,
	string? CashbackType,
	string? Iban);

public record MonobankClientInfoDto(
	string? ClientId,
	string? Name,
	string? WebHookUrl,
	IReadOnlyList<MonobankAccountDto> Accounts,
	IReadOnlyList<MonobankJarDto> Jars);
