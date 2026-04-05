using System.Net;
using System.Net.Http;
using System.Text;
using Microsoft.Extensions.Options;
using ProzoroBanka.Infrastructure.Services.Receipts;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Receipts;

public class TaxCabinetStateReceiptValidatorTests
{
	[Fact]
	public async Task ValidateFiscalAsync_WhenResponseContainsCheck_ReturnsVerified()
	{
		var options = Options.Create(new StateValidatorOptions
		{
			Enabled = true,
			BaseUrl = "https://cabinet.tax.gov.ua",
			Fiscal = new FiscalValidationOptions
			{
				EndpointPath = "/ws/api_public/rro/chkAll",
				DocumentType = 3
			}
		});

		var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
		{
			Content = new StringContent("{\"check\":\"BASE64\",\"resultCode\":null,\"resultText\":null}", Encoding.UTF8, "application/json")
		});

		using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://cabinet.tax.gov.ua") };
		var sut = new TaxCabinetStateReceiptValidator(httpClient, options);

		var result = await sut.ValidateFiscalAsync("123456", "token-abc", CancellationToken.None);

		Assert.True(result.IsVerified);
		Assert.Equal("123456", result.VerificationReference);
		Assert.Null(result.FailureReason);
	}

	[Fact]
	public async Task ValidateBankTransferAsync_WhenResponseHasTin_ReturnsVerified()
	{
		var options = Options.Create(new StateValidatorOptions
		{
			Enabled = true,
			BaseUrl = "https://cabinet.tax.gov.ua",
			BankTransfer = new BankTransferValidationOptions
			{
				EndpointPath = "/ws/api/public/registers/registration"
			}
		});

		var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
		{
			Content = new StringContent("{\"TIN_S\":\"34554355\",\"FULL_NAME\":\"ТОВ ТЕСТ\"}", Encoding.UTF8, "application/json")
		});

		using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://cabinet.tax.gov.ua") };
		var sut = new TaxCabinetStateReceiptValidator(httpClient, options);

		var result = await sut.ValidateBankTransferAsync("34554355", "token-abc", CancellationToken.None);

		Assert.True(result.IsVerified);
		Assert.Equal("34554355", result.VerificationReference);
	}

	[Fact]
	public async Task ValidateFiscalAsync_WhenDisabled_ReturnsFailure()
	{
		var options = Options.Create(new StateValidatorOptions
		{
			Enabled = false
		});

		using var httpClient = new HttpClient(new StubHttpMessageHandler(_ => throw new InvalidOperationException("Should not be called")))
		{
			BaseAddress = new Uri("https://cabinet.tax.gov.ua")
		};

		var sut = new TaxCabinetStateReceiptValidator(httpClient, options);

		var result = await sut.ValidateFiscalAsync("123456", "token-abc", CancellationToken.None);

		Assert.False(result.IsVerified);
		Assert.Contains("disabled", result.FailureReason, StringComparison.OrdinalIgnoreCase);
	}

	[Fact]
	public async Task ValidateFiscalAsync_WhenDisabledAndVerifyWhenDisabledEnabled_ReturnsVerified()
	{
		var options = Options.Create(new StateValidatorOptions
		{
			Enabled = false,
			VerifyWhenDisabled = true
		});

		using var httpClient = new HttpClient(new StubHttpMessageHandler(_ => throw new InvalidOperationException("Should not be called")))
		{
			BaseAddress = new Uri("https://cabinet.tax.gov.ua")
		};

		var sut = new TaxCabinetStateReceiptValidator(httpClient, options);

		var result = await sut.ValidateFiscalAsync("123456", "token-abc", CancellationToken.None);

		Assert.True(result.IsVerified);
		Assert.Equal("123456", result.VerificationReference);
		Assert.Null(result.FailureReason);
	}

	[Fact]
	public async Task ValidateBankTransferAsync_WhenDisabledAndVerifyWhenDisabledEnabled_ReturnsVerified()
	{
		var options = Options.Create(new StateValidatorOptions
		{
			Enabled = false,
			VerifyWhenDisabled = true
		});

		using var httpClient = new HttpClient(new StubHttpMessageHandler(_ => throw new InvalidOperationException("Should not be called")))
		{
			BaseAddress = new Uri("https://cabinet.tax.gov.ua")
		};

		var sut = new TaxCabinetStateReceiptValidator(httpClient, options);

		var result = await sut.ValidateBankTransferAsync("34554355", "token-abc", CancellationToken.None);

		Assert.True(result.IsVerified);
		Assert.Equal("34554355", result.VerificationReference);
		Assert.Null(result.FailureReason);
	}

	private sealed class StubHttpMessageHandler : HttpMessageHandler
	{
		private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

		public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
		{
			_responseFactory = responseFactory;
		}

		protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
		{
			return Task.FromResult(_responseFactory(request));
		}
	}
}
