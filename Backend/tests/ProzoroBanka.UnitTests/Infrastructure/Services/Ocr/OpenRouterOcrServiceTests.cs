using System.Net;
using System.Net.Http;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using ProzoroBanka.Infrastructure.Services.Ocr;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Ocr;

public class OpenRouterOcrServiceTests
{
	[Fact]
	public async Task ParseReceiptAsync_UsesApiBasePath_WhenPostingCompletions()
	{
		Uri? requestUri = null;
		var sut = CreateSut(request =>
		{
			requestUri = request.RequestUri;
			return JsonResponse(HttpStatusCode.OK, """
			{
			  "choices": [
			    {
			      "message": {
			        "content": "{\"Date\":\"2026-04-10\",\"Time\":\"14:05:52\",\"FiscalNumber\":\"123\",\"ReceiptNumber\":\"456\",\"TotalAmount\":42.5}"
			      }
			    }
			  ]
			}
			""");
		});

		using var imageStream = new MemoryStream(Encoding.UTF8.GetBytes("img"));
		await sut.ParseReceiptAsync(imageStream, "receipt.webp", "google/gemma-4-26b-a4b-it:free", CancellationToken.None);

		Assert.NotNull(requestUri);
		Assert.Equal("https://openrouter.ai/api/v1/chat/completions", requestUri!.ToString());
	}

	[Fact]
	public async Task ParseReceiptAsync_WhenBaseAddressMissesApi_UsesCanonicalApiEndpoint()
	{
		Uri? requestUri = null;
		var sut = CreateSut(
			request =>
			{
				requestUri = request.RequestUri;
				return JsonResponse(HttpStatusCode.OK, """
				{
				  "choices": [
				    {
				      "message": {
				        "content": "{\"Date\":\"2026-04-10\",\"Time\":\"14:05:52\",\"FiscalNumber\":\"123\",\"ReceiptNumber\":\"456\",\"TotalAmount\":42.5}"
				      }
				    }
				  ]
				}
				""");
			},
			"https://openrouter.ai/");

		using var imageStream = new MemoryStream(Encoding.UTF8.GetBytes("img"));
		await sut.ParseReceiptAsync(imageStream, "receipt.webp", "google/gemma-4-26b-a4b-it:free", CancellationToken.None);

		Assert.NotNull(requestUri);
		Assert.Equal("https://openrouter.ai/api/v1/chat/completions", requestUri!.ToString());
	}

	[Fact]
	public async Task ParseReceiptAsync_WhenBaseAddressApiWithoutTrailingSlash_UsesApiV1Endpoint()
	{
		Uri? requestUri = null;
		var sut = CreateSut(
			request =>
			{
				requestUri = request.RequestUri;
				return JsonResponse(HttpStatusCode.OK, """
				{
				  "choices": [
				    {
				      "message": {
				        "content": "{\"Date\":\"2026-04-10\",\"Time\":\"14:05:52\",\"FiscalNumber\":\"123\",\"ReceiptNumber\":\"456\",\"TotalAmount\":42.5}"
				      }
				    }
				  ]
				}
				""");
			},
			"https://openrouter.ai/api");

		using var imageStream = new MemoryStream(Encoding.UTF8.GetBytes("img"));
		await sut.ParseReceiptAsync(imageStream, "receipt.webp", "google/gemma-4-26b-a4b-it:free", CancellationToken.None);

		Assert.NotNull(requestUri);
		Assert.Equal("https://openrouter.ai/api/v1/chat/completions", requestUri!.ToString());
	}

	[Fact]
	public async Task ParseReceiptAsync_WhenHtmlBody_ReturnsFailureWithoutJsonException()
	{
		var sut = CreateSut(_ => new HttpResponseMessage(HttpStatusCode.OK)
		{
			Content = new StringContent("<html><body>Oops</body></html>", Encoding.UTF8, "text/html")
		});

		using var imageStream = new MemoryStream(Encoding.UTF8.GetBytes("img"));
		var result = await sut.ParseReceiptAsync(imageStream, "receipt.webp", null, CancellationToken.None);

		Assert.False(result.Success);
		Assert.NotNull(result.ErrorMessage);
		Assert.Contains("non-JSON HTML", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
	}

	[Fact]
	public async Task ParseReceiptAsync_WhenContentTypeNotJsonAndBodyNotJson_ReturnsFailure()
	{
		var sut = CreateSut(_ => new HttpResponseMessage(HttpStatusCode.OK)
		{
			Content = new StringContent("temporary upstream text", Encoding.UTF8, "text/plain")
		});

		using var imageStream = new MemoryStream(Encoding.UTF8.GetBytes("img"));
		var result = await sut.ParseReceiptAsync(imageStream, "receipt.webp", null, CancellationToken.None);

		Assert.False(result.Success);
		Assert.NotNull(result.ErrorMessage);
		Assert.Contains("non-JSON response", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
	}

	[Fact]
	public async Task ParseReceiptAsync_WhenEnvelopeMissingChoices_ReturnsFailure()
	{
		var sut = CreateSut(_ => JsonResponse(HttpStatusCode.OK, "{" + "\"id\":\"abc\"}"));

		using var imageStream = new MemoryStream(Encoding.UTF8.GetBytes("img"));
		var result = await sut.ParseReceiptAsync(imageStream, "receipt.webp", null, CancellationToken.None);

		Assert.False(result.Success);
		Assert.NotNull(result.ErrorMessage);
		Assert.Contains("invalid response envelope", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
	}

	[Fact]
	public async Task ParseReceiptAsync_WhenTopLevelErrorPayloadReturned_ReturnsUpstreamFailure()
	{
		var sut = CreateSut(_ => JsonResponse(HttpStatusCode.OK, """
		{
		  "error": {
		    "message": "Upstream error from Nvidia: EngineCore encountered an issue.",
		    "code": 502
		  }
		}
		"""));

		using var imageStream = new MemoryStream(Encoding.UTF8.GetBytes("img"));
		var result = await sut.ParseReceiptAsync(imageStream, "receipt.webp", null, CancellationToken.None);

		Assert.False(result.Success);
		Assert.NotNull(result.ErrorMessage);
		Assert.Contains("upstream error", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
		Assert.Contains("502", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
	}

	[Fact]
	public async Task ParseReceiptAsync_WhenValidEnvelope_ReturnsParsedOcrResult()
	{
		var sut = CreateSut(_ => JsonResponse(HttpStatusCode.OK, """
		{
		  "choices": [
		    {
		      "message": {
		        "content": "{\"Date\":\"2026-04-10\",\"Time\":\"14:05:52\",\"FiscalNumber\":\"FN123\",\"ReceiptNumber\":\"RN456\",\"MerchantName\":\"ATB\",\"TotalAmount\":199.99}"
		      }
		    }
		  ]
		}
		"""));

		using var imageStream = new MemoryStream(Encoding.UTF8.GetBytes("img"));
		var result = await sut.ParseReceiptAsync(imageStream, "receipt.webp", null, CancellationToken.None);

		Assert.True(result.Success);
		Assert.Equal("ATB", result.MerchantName);
		Assert.Equal(199.99m, result.TotalAmount);
		Assert.Equal("FN123", result.FiscalRegisterNumber);
		Assert.Equal("RN456", result.FiscalReceiptNumber);
	}

	private static OpenRouterOcrService CreateSut(Func<HttpRequestMessage, HttpResponseMessage> responseFactory, string baseAddress = "https://openrouter.ai/api/")
	{
		var handler = new StubHttpMessageHandler(responseFactory);
		var httpClient = new HttpClient(handler)
		{
			BaseAddress = new Uri(baseAddress)
		};
		return new OpenRouterOcrService(httpClient, NullLogger<OpenRouterOcrService>.Instance);
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
}
