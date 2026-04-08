using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using ProzoroBanka.Infrastructure.Services.Ocr;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Ocr;

public class OcrOptionsValidationTests
{
	[Fact]
	public void DefaultOptions_AreValid_WhenExtractionStubEnabled()
	{
		var config = BuildConfig(new Dictionary<string, string?>());

		var options = BindAndValidate(config);

		Assert.True(options.UseExtractionStub);
	}

	[Fact]
	public void NonStub_RequiresAtLeastOneConfiguredProvider()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:UseExtractionStub"] = "false",
			["Ocr:Mistral:ApiKey"] = "",
			["Ocr:OpenRouter:ApiKey"] = ""
		});

		Assert.Throws<OptionsValidationException>(() => BindAndValidate(config));
	}

	[Fact]
	public void NonStub_IsValid_WhenMistralConfigured()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:UseExtractionStub"] = "false",
			["Ocr:Mistral:ApiKey"] = "test-mistral-key",
			["Ocr:Mistral:BaseUrl"] = "https://api.mistral.ai"
		});

		var options = BindAndValidate(config);

		Assert.True(options.Mistral.IsConfigured);
	}

	[Fact]
	public void NonStub_IsValid_WhenOpenRouterConfigured()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:UseExtractionStub"] = "false",
			["Ocr:OpenRouter:ApiKey"] = "test-openrouter-key",
			["Ocr:OpenRouter:BaseUrl"] = "https://openrouter.ai/api"
		});

		var options = BindAndValidate(config);

		Assert.True(options.OpenRouter.IsConfigured);
		Assert.Equal("https://openrouter.ai/api", options.OpenRouter.BaseUrl);
	}

	[Fact]
	public void Timeouts_AreBindable()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:Mistral:TimeoutSeconds"] = "90",
			["Ocr:OpenRouter:TimeoutSeconds"] = "45"
		});

		var options = BindAndValidate(config);

		Assert.Equal(90, options.Mistral.TimeoutSeconds);
		Assert.Equal(45, options.OpenRouter.TimeoutSeconds);
	}

	[Fact]
	public void UseExtractionStub_DefaultsToTrue()
	{
		var config = BuildConfig(new Dictionary<string, string?>());

		var options = BindAndValidate(config);

		Assert.True(options.UseExtractionStub);
	}

	[Fact]
	public void UseExtractionStub_CanBeDisabled()
	{
		var config = BuildConfig(new Dictionary<string, string?>
		{
			["Ocr:UseExtractionStub"] = "false",
			["Ocr:Mistral:ApiKey"] = "test-mistral-key"
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
