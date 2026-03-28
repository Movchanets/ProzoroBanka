using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.UnitTests.Application.Common.Behaviors;

public class CacheInvalidationBehaviorTests
{
	[Fact]
	public async Task Handle_WhenCacheInvalidationThrows_ReturnsSuccessResponse()
	{
		var cacheInvalidation = new Mock<ICacheInvalidationService>();
		cacheInvalidation
			.Setup(x => x.InvalidateByTagsAsync(It.IsAny<IEnumerable<string>>(), It.IsAny<CancellationToken>()))
			.ThrowsAsync(new InvalidOperationException("Redis unavailable"));

		var behavior = new CacheInvalidationBehavior<TestCommand, ServiceResponse>(
			NullLogger<CacheInvalidationBehavior<TestCommand, ServiceResponse>>.Instance,
			cacheInvalidation.Object);

		var request = new TestCommand();
		RequestHandlerDelegate<ServiceResponse> next = _ => Task.FromResult(ServiceResponse.Success());

		var result = await behavior.Handle(request, next, CancellationToken.None);

		Assert.True(result.IsSuccess);
		cacheInvalidation.Verify(
			x => x.InvalidateByTagsAsync(
				It.Is<IEnumerable<string>>(tags => tags.SequenceEqual(TestCommand.Tags)),
				It.IsAny<CancellationToken>()),
			Times.Once);
	}

	private sealed record TestCommand : IRequest<ServiceResponse>, ICacheInvalidatingCommand
	{
		public static readonly string[] Tags = ["organizations", "public-organizations"];
		public IEnumerable<string> CacheTags => Tags;
	}
}
