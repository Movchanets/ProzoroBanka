using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Infrastructure.Services.Ocr;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Ocr;

public class OcrRegistrationTests
{
	[Fact]
	public void AddOcrServices_ResolvesDocumentStub_WhenExtractionStubEnabled()
	{
		var services = new ServiceCollection();
		services.AddLogging();
		services.AddOcrServices(BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:UseExtractionStub"] = "true"
		}));

		using var provider = services.BuildServiceProvider();

		var service = provider.GetRequiredService<IDocumentOcrService>();

		Assert.IsType<StubDocumentOcrService>(service);
	}

	[Fact]
	public void AddOcrServices_ResolvesMistralDocumentService_WhenExtractionStubDisabled()
	{
		var services = new ServiceCollection();
		services.AddLogging();
		services.AddOcrServices(BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:UseExtractionStub"] = "false",
			["Ocr:Mistral:ApiKey"] = "test-mistral-key",
			["Ocr:Mistral:BaseUrl"] = "https://api.mistral.ai"
		}));

		using var provider = services.BuildServiceProvider();

		var service = provider.GetRequiredService<IDocumentOcrService>();

		Assert.IsType<MistralPurchaseDocumentOcrService>(service);
	}

	private static IConfiguration BuildConfig(Dictionary<string, string?> values)
	{
		return new ConfigurationBuilder()
			.AddInMemoryCollection(values)
			.Build();
	}
}