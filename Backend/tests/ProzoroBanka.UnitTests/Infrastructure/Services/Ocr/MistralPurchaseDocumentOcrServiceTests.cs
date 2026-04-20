using System.Net;
using System.Net.Http;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Services.Ocr;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Ocr;

public class MistralPurchaseDocumentOcrServiceTests
{
	[Fact]
	public async Task ParseDocumentAsync_UsesOcrEndpoint()
	{
		Uri? requestUri = null;
		var sut = CreateSut(request =>
		{
			requestUri = request.RequestUri;
			return JsonResponse(HttpStatusCode.OK, """
			{
			  "pages": [
			    {
			      "document_annotation": {
			        "date": "2026-04-18",
			        "supplier_name": "ТОВ Дрони",
			        "total_amount": 125000.50
			      }
			    }
			  ]
			}
			""");
		});

		using var stream = new MemoryStream(Encoding.UTF8.GetBytes("doc"));
		await sut.ParseDocumentAsync(stream, "doc.pdf", DocumentType.Waybill, null, CancellationToken.None);

		Assert.NotNull(requestUri);
		Assert.Equal("https://api.mistral.ai/v1/ocr", requestUri!.ToString());
	}

	[Fact]
	public async Task ParseDocumentAsync_WhenPayloadInMarkdown_ParsesSuccessfully()
	{
		var sut = CreateSut(_ => JsonResponse(HttpStatusCode.OK, """
		{
		  "pages": [
		    {
		      "markdown": "```json\n{\"date\":\"2026-04-18\",\"counterparty_name\":\"ТОВ Маркет\",\"amount\":420.15}\n```"
		    }
		  ]
		}
		"""));

		using var stream = new MemoryStream(Encoding.UTF8.GetBytes("doc"));
		var result = await sut.ParseDocumentAsync(stream, "doc.png", DocumentType.Other, null, CancellationToken.None);

		Assert.True(result.Success);
		Assert.Equal("ТОВ Маркет", result.CounterpartyName);
		Assert.Equal(420.15m, result.TotalAmount);
		Assert.Equal(new DateTime(2026, 4, 18), result.DocumentDate);
	}

	[Fact]
	public async Task ParseDocumentAsync_WhenTopLevelDocumentAnnotationString_ParsesSuccessfully()
	{
		var sut = CreateSut(_ => JsonResponse(HttpStatusCode.OK, """
		{
		  "document_annotation": "{\"date\":\"2026-04-20\",\"receiver_name\":\"БФ Допомога\",\"total_amount\":9999.99}"
		}
		"""));

		using var stream = new MemoryStream(Encoding.UTF8.GetBytes("doc"));
		var result = await sut.ParseDocumentAsync(stream, "receipt.jpg", DocumentType.BankReceipt, null, CancellationToken.None);

		Assert.True(result.Success);
		Assert.Equal("БФ Допомога", result.CounterpartyName);
		Assert.Equal(9999.99m, result.TotalAmount);
	}

	[Fact]
	public async Task ParseDocumentAsync_WhenNoStructuredPayload_ReturnsFailure()
	{
		var sut = CreateSut(_ => JsonResponse(HttpStatusCode.OK, """
		{
		  "pages": [
		    {
		      "text": "raw OCR text"
		    }
		  ]
		}
		"""));

		using var stream = new MemoryStream(Encoding.UTF8.GetBytes("doc"));
		var result = await sut.ParseDocumentAsync(stream, "doc.pdf", DocumentType.Waybill, null, CancellationToken.None);

		Assert.False(result.Success);
		Assert.Contains("No structured JSON", result.ErrorMessage ?? string.Empty, StringComparison.OrdinalIgnoreCase);
	}

	[Fact]
	public async Task ParseDocumentAsync_WhenTransferAct_StillUsesOcrEndpoint()
	{
		var handler = new CountingHandler(_ => JsonResponse(HttpStatusCode.OK, "{}"));
		var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.mistral.ai") };
		var sut = new MistralPurchaseDocumentOcrService(httpClient, NullLogger<MistralPurchaseDocumentOcrService>.Instance);

		using var stream = new MemoryStream(Encoding.UTF8.GetBytes("doc"));
		var result = await sut.ParseDocumentAsync(stream, "act.pdf", DocumentType.TransferAct, null, CancellationToken.None);

		Assert.False(result.Success);
		Assert.Contains("No structured JSON", result.ErrorMessage ?? string.Empty, StringComparison.OrdinalIgnoreCase);
		Assert.Equal(1, handler.CallCount);
	}

	private static MistralPurchaseDocumentOcrService CreateSut(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
	{
		var handler = new StubHttpMessageHandler(responseFactory);
		var httpClient = new HttpClient(handler)
		{
			BaseAddress = new Uri("https://api.mistral.ai")
		};

		return new MistralPurchaseDocumentOcrService(httpClient, NullLogger<MistralPurchaseDocumentOcrService>.Instance);
	}

	private static HttpResponseMessage JsonResponse(HttpStatusCode statusCode, string body)
	{
		return new HttpResponseMessage(statusCode)
		{
			Content = new StringContent(body, Encoding.UTF8, "application/json")
		};
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

	private sealed class CountingHandler : HttpMessageHandler
	{
		private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;
		public int CallCount { get; private set; }

		public CountingHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
		{
			_responseFactory = responseFactory;
		}

		protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
		{
			CallCount++;
			return Task.FromResult(_responseFactory(request));
		}
	}
}
