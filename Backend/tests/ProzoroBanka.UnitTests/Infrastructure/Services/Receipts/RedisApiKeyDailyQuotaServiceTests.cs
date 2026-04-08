using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using ProzoroBanka.Infrastructure.Services.Receipts;

namespace ProzoroBanka.UnitTests.Infrastructure.Services.Receipts;

public class RedisApiKeyDailyQuotaServiceTests
{
	private static IDistributedCache CreateMemoryCache()
	{
		var options = Options.Create(new MemoryDistributedCacheOptions());
		return new MemoryDistributedCache(options);
	}

	[Fact]
	public async Task TryConsumeAsync_WhenBelowLimit_AllowsUntilLimitAndThenBlocks()
	{
		var cache = CreateMemoryCache();
		var options = Options.Create(new StateValidatorOptions
		{
			Enabled = true,
			DailyLimitPerToken = 2
		});

		var sut = new RedisApiKeyDailyQuotaService(cache, options);
		var now = DateTime.UtcNow;

		var first = await sut.TryConsumeAsync("key-fp-1", now, CancellationToken.None);
		var second = await sut.TryConsumeAsync("key-fp-1", now, CancellationToken.None);
		var third = await sut.TryConsumeAsync("key-fp-1", now, CancellationToken.None);

		Assert.True(first.Allowed);
		Assert.True(second.Allowed);
		Assert.False(third.Allowed);
	}

	[Fact]
	public async Task TryConsumeAsync_WhenDisabled_AlwaysAllows()
	{
		var cache = CreateMemoryCache();
		var options = Options.Create(new StateValidatorOptions
		{
			Enabled = false,
			DailyLimitPerToken = 1
		});

		var sut = new RedisApiKeyDailyQuotaService(cache, options);
		var now = DateTime.UtcNow;

		var first = await sut.TryConsumeAsync("key-fp-2", now, CancellationToken.None);
		var second = await sut.TryConsumeAsync("key-fp-2", now, CancellationToken.None);

		Assert.True(first.Allowed);
		Assert.True(second.Allowed);
	}
}
