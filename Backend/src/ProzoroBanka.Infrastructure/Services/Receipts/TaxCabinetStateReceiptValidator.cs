using System.Net.Http.Json;
using System.Text.Json;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Infrastructure.Services.Receipts;

public class TaxCabinetStateReceiptValidator : IStateReceiptValidator
{
	private readonly HttpClient _httpClient;
	private readonly StateValidatorOptions _options;

	public TaxCabinetStateReceiptValidator(HttpClient httpClient, Microsoft.Extensions.Options.IOptions<StateValidatorOptions> options)
	{
		_httpClient = httpClient;
		_options = options.Value;
	}

	public async Task<RegistryValidationResult> ValidateFiscalAsync(string fiscalNumber, string apiToken, CancellationToken ct)
	{
		if (string.IsNullOrWhiteSpace(fiscalNumber))
			return new RegistryValidationResult(false, null, "FiscalNumber не заповнено");

		if (!_options.Enabled)
			return new RegistryValidationResult(false, null, "State validation service is disabled by configuration");

		if (string.IsNullOrWhiteSpace(apiToken))
			return new RegistryValidationResult(false, null, "API токен державного реєстру не заповнено");

		var path = _options.Fiscal.EndpointPath;
		var uri = $"{path}?id={Uri.EscapeDataString(fiscalNumber)}&type={_options.Fiscal.DocumentType}&token={Uri.EscapeDataString(apiToken)}";

		try
		{
			using var response = await _httpClient.GetAsync(uri, ct);
			if (!response.IsSuccessStatusCode)
				return new RegistryValidationResult(false, null, $"Помилка сервісу ДПС: {(int)response.StatusCode}");

			await using var stream = await response.Content.ReadAsStreamAsync(ct);
			using var json = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
			var root = json.RootElement;

			var hasCheck = root.TryGetProperty("check", out var check)
				&& check.ValueKind == JsonValueKind.String
				&& !string.IsNullOrWhiteSpace(check.GetString());

			var resultCode = root.TryGetProperty("resultCode", out var codeValue)
				? codeValue.GetString()
				: null;

			var resultText = root.TryGetProperty("resultText", out var textValue)
				? textValue.GetString()
				: null;

			if (hasCheck && string.IsNullOrWhiteSpace(resultCode))
				return new RegistryValidationResult(true, fiscalNumber, null);

			return new RegistryValidationResult(false, fiscalNumber, resultText ?? "Чек не знайдено у державному реєстрі");
		}
		catch (OperationCanceledException)
		{
			throw;
		}
		catch (Exception)
		{
			return new RegistryValidationResult(false, fiscalNumber, "Помилка виклику державного реєстру");
		}
	}

	public async Task<RegistryValidationResult> ValidateBankTransferAsync(string receiptCode, string apiToken, CancellationToken ct)
	{
		if (string.IsNullOrWhiteSpace(receiptCode))
			return new RegistryValidationResult(false, null, "ReceiptCode не заповнено");

		if (!_options.Enabled)
			return new RegistryValidationResult(false, null, "State validation service is disabled by configuration");

		if (string.IsNullOrWhiteSpace(apiToken))
			return new RegistryValidationResult(false, null, "API токен державного реєстру не заповнено");

		var payload = new
		{
			tins = receiptCode,
			name = (string?)null,
			token = apiToken
		};

		try
		{
			using var response = await _httpClient.PostAsJsonAsync(_options.BankTransfer.EndpointPath, payload, ct);
			if (!response.IsSuccessStatusCode)
				return new RegistryValidationResult(false, null, $"Помилка сервісу ДПС: {(int)response.StatusCode}");

			await using var stream = await response.Content.ReadAsStreamAsync(ct);
			using var json = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
			var root = json.RootElement;

			if (root.ValueKind == JsonValueKind.Object)
			{
				if (root.TryGetProperty("TIN_S", out var tin) && !string.IsNullOrWhiteSpace(tin.GetString()))
					return new RegistryValidationResult(true, tin.GetString(), null);

				if (root.TryGetProperty("FULL_NAME", out var fullName) && !string.IsNullOrWhiteSpace(fullName.GetString()))
					return new RegistryValidationResult(true, fullName.GetString(), null);
			}

			if (root.ValueKind == JsonValueKind.Array && root.GetArrayLength() > 0)
			{
				var first = root[0];
				if (first.ValueKind == JsonValueKind.Object)
				{
					if (first.TryGetProperty("TIN_S", out var tin) && !string.IsNullOrWhiteSpace(tin.GetString()))
						return new RegistryValidationResult(true, tin.GetString(), null);

					if (first.TryGetProperty("FULL_NAME", out var fullName) && !string.IsNullOrWhiteSpace(fullName.GetString()))
						return new RegistryValidationResult(true, fullName.GetString(), null);
				}
			}

			return new RegistryValidationResult(false, receiptCode, "Платника не знайдено у державному реєстрі");
		}
		catch (OperationCanceledException)
		{
			throw;
		}
		catch (Exception)
		{
			return new RegistryValidationResult(false, receiptCode, "Помилка виклику державного реєстру");
		}
	}
}
