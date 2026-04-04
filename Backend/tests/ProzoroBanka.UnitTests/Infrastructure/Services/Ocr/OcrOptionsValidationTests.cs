using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ProzoroBanka.Infrastructure.Services.Ocr;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Ocr;

public class OcrOptionsValidationTests
{
	[Fact]
	public void DefaultOptions_AreValid_WhenProviderIsFallback()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = "fallback"
		});

		var options = BindAndValidate(config);

		Assert.Equal("fallback", options.Provider);
		Assert.True(options.UseExtractionStub);
	}

	[Theory]
	[InlineData("azure")]
	[InlineData("AzureDocumentIntelligence")]
	public void AzureProvider_RequiresEndpointAndApiKey(string provider)
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = provider,
			["Ocr:Azure:Endpoint"] = "",
			["Ocr:Azure:ApiKey"] = ""
		});

		Assert.Throws<OptionsValidationException>(() => BindAndValidate(config));
	}

	[Theory]
	[InlineData("azure")]
	[InlineData("AzureDocumentIntelligence")]
	public void AzureProvider_ValidWhenConfigured(string provider)
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = provider,
			["Ocr:Azure:Endpoint"] = "https://my-di.cognitiveservices.azure.com/",
			["Ocr:Azure:ApiKey"] = "test-api-key"
		});

		var options = BindAndValidate(config);

		Assert.True(options.Azure.IsConfigured);
	}

	[Fact]
	public void MistralProvider_RequiresApiKey()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = "mistral",
			["Ocr:Mistral:ApiKey"] = ""
		});

		Assert.Throws<OptionsValidationException>(() => BindAndValidate(config));
	}

	[Fact]
	public void MistralProvider_ValidWhenApiKeySet()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = "mistral",
			["Ocr:Mistral:ApiKey"] = "test-mistral-key",
			["Ocr:Mistral:BaseUrl"] = "https://api.mistral.ai"
		});

		var options = BindAndValidate(config);

		Assert.True(options.Mistral.IsConfigured);
		Assert.Equal("https://api.mistral.ai", options.Mistral.BaseUrl);
	}

	[Fact]
	public void UnknownProvider_FailsValidation()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = "unknown-provider"
		});

		Assert.Throws<OptionsValidationException>(() => BindAndValidate(config));
	}

	[Fact]
	public void TimeoutsAndModelIds_AreBindable()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = "fallback",
			["Ocr:Azure:TimeoutSeconds"] = "45",
			["Ocr:Azure:ModelId"] = "prebuilt-invoice",
			["Ocr:Mistral:TimeoutSeconds"] = "90",
			["Ocr:Mistral:ModelId"] = "mistral-ocr-v2"
		});

		var options = BindAndValidate(config);

		Assert.Equal(45, options.Azure.TimeoutSeconds);
		Assert.Equal("prebuilt-invoice", options.Azure.ModelId);
		Assert.Equal(90, options.Mistral.TimeoutSeconds);
		Assert.Equal("mistral-ocr-v2", options.Mistral.ModelId);
	}

	[Fact]
	public void UseExtractionStub_DefaultsToTrue()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = "fallback"
		});

		var options = BindAndValidate(config);

		Assert.True(options.UseExtractionStub);
	}

	[Fact]
	public void UseExtractionStub_CanBeDisabled()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Provider"] = "fallback",
			["Ocr:UseExtractionStub"] = "false"
		});

		var options = BindAndValidate(config);

		Assert.False(options.UseExtractionStub);
	}

	private static IConfiguration BuildConfig(Dictionary<string, string?> values)
	{
		return new ConfigurationBuilder()
			.AddInMemoryCollection(values)
			.Build();
	}

	/// <summary>
	/// Builds a service provider with OcrOptions bound and validated, then resolves the options.
	/// Throws <see cref="OptionsValidationException"/> if validation fails.
	/// </summary>
	private static OcrOptions BindAndValidate(IConfiguration config)
	{
		var services = new ServiceCollection();
		services.AddOcrServices(config);
		var sp = services.BuildServiceProvider();
		return sp.GetRequiredService<IOptions<OcrOptions>>().Value;
	}
}
