using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Campaigns.Commands.UpdateCampaignPost;

public record UpdateCampaignPostCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	Guid PostId,
	string? PostContentJson,
	IReadOnlyList<Guid>? RemoveImageIds,
	IReadOnlyList<Guid>? ImageOrderIds)
	: IRequest<ServiceResponse<CampaignPostDto>>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Campaigns];
}

public class UpdateCampaignPostCommandValidator : AbstractValidator<UpdateCampaignPostCommand>
{
	public UpdateCampaignPostCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.PostId).NotEmpty();
		RuleFor(x => x.PostContentJson)
			.MaximumLength(20000)
			.When(x => x.PostContentJson is not null);
		RuleFor(x => x.RemoveImageIds)
			.Must(ids => ids is null || ids.Distinct().Count() == ids.Count)
			.WithMessage("Ідентифікатори зображень для видалення повинні бути унікальними.");
	}
}

public class UpdateCampaignPostHandler : IRequestHandler<UpdateCampaignPostCommand, ServiceResponse<CampaignPostDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public UpdateCampaignPostHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<CampaignPostDto>> Handle(UpdateCampaignPostCommand request, CancellationToken cancellationToken)
	{
		var post = await _db.CampaignPosts
			.Include(p => p.Campaign)
				.ThenInclude(c => c.Organization)
				.ThenInclude(o => o.Members)
			.Include(p => p.Images)
			.FirstOrDefaultAsync(p => p.Id == request.PostId && p.CampaignId == request.CampaignId, cancellationToken);

		if (post is null)
			return ServiceResponse<CampaignPostDto>.Failure("Пост не знайдено.");

		var member = post.Campaign.Organization.Members.FirstOrDefault(m => m.UserId == request.CallerDomainUserId);
		if (member is null)
			return ServiceResponse<CampaignPostDto>.Failure("Недостатньо прав для оновлення поста.");

		if (request.PostContentJson is not null)
			post.PostContentJson = string.IsNullOrWhiteSpace(request.PostContentJson) ? null : request.PostContentJson.Trim();

		if (request.RemoveImageIds is not null && request.RemoveImageIds.Count > 0)
		{
			var toRemove = post.Images.Where(i => request.RemoveImageIds.Contains(i.Id)).ToList();
			foreach (var image in toRemove)
			{
				image.IsDeleted = true;
				await _fileStorage.DeleteAsync(image.StorageKey, cancellationToken);
			}
		}

		if (request.ImageOrderIds is not null && request.ImageOrderIds.Count > 0)
		{
			var sortOrder = 0;
			foreach (var imageId in request.ImageOrderIds)
			{
				var image = post.Images.FirstOrDefault(i => i.Id == imageId && !i.IsDeleted);
				if (image is not null)
				{
					image.SortOrder = sortOrder;
					sortOrder++;
				}
			}
		}

		await _db.SaveChangesAsync(cancellationToken);

		var dto = new CampaignPostDto(
			post.Id,
			post.PostContentJson,
			post.Images
				.Where(i => !i.IsDeleted)
				.OrderBy(i => i.SortOrder)
				.Select(i => new CampaignPostImageDto(
					i.Id,
					_fileStorage.GetPublicUrl(i.StorageKey),
					i.OriginalFileName,
					i.SortOrder))
				.ToList(),
			post.CreatedAt,
			post.UpdatedAt);

		return ServiceResponse<CampaignPostDto>.Success(dto);
	}
}
