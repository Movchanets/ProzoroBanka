using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Campaigns.DTOs;
using ProzoroBanka.Application.Common;
using ProzoroBanka.Application.Common.Behaviors;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Campaigns.Commands.CreateCampaignPost;

public record CampaignPostUploadFile(
	Stream FileStream,
	string FileName,
	string ContentType);

public record CreateCampaignPostCommand(
	Guid CallerDomainUserId,
	Guid CampaignId,
	string? PostContentJson,
	IReadOnlyList<CampaignPostUploadFile> Files)
	: IRequest<ServiceResponse<CampaignPostDto>>, ICacheInvalidatingCommand
{
	public IEnumerable<string> CacheTags => [CacheTag.Campaigns];
}

public class CreateCampaignPostCommandValidator : AbstractValidator<CreateCampaignPostCommand>
{
	public CreateCampaignPostCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.CampaignId).NotEmpty();
		RuleFor(x => x.PostContentJson)
			.MaximumLength(20000)
			.When(x => x.PostContentJson is not null);
		RuleFor(x => x.Files.Count)
			.LessThanOrEqualTo(10)
			.WithMessage("Максимум 10 зображень у пості.");
		RuleFor(x => x)
			.Must(x => !string.IsNullOrWhiteSpace(x.PostContentJson) || x.Files.Count > 0)
			.WithMessage("Пост повинен містити текст або хоча б одне зображення.");
	}
}

public class CreateCampaignPostHandler : IRequestHandler<CreateCampaignPostCommand, ServiceResponse<CampaignPostDto>>
{
	private readonly IApplicationDbContext _db;
	private readonly IFileStorage _fileStorage;

	public CreateCampaignPostHandler(IApplicationDbContext db, IFileStorage fileStorage)
	{
		_db = db;
		_fileStorage = fileStorage;
	}

	public async Task<ServiceResponse<CampaignPostDto>> Handle(CreateCampaignPostCommand request, CancellationToken cancellationToken)
	{
		var campaign = await _db.Campaigns
			.Include(c => c.Organization)
			.ThenInclude(o => o.Members)
			.FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

		if (campaign is null)
			return ServiceResponse<CampaignPostDto>.Failure("Збір не знайдено.");

		var member = campaign.Organization.Members.FirstOrDefault(m => m.UserId == request.CallerDomainUserId);
		if (member is null)
			return ServiceResponse<CampaignPostDto>.Failure("Недостатньо прав для створення поста.");

		var uploadedFiles = new List<(string StorageKey, string OriginalFileName, int SortOrder)>();
		for (var index = 0; index < request.Files.Count; index++)
		{
			var file = request.Files[index];
			var storageKey = await _fileStorage.UploadAsync(file.FileStream, file.FileName, file.ContentType, cancellationToken);
			if (string.IsNullOrWhiteSpace(storageKey))
				return ServiceResponse<CampaignPostDto>.Failure("Помилка завантаження зображень поста.");

			uploadedFiles.Add((storageKey, file.FileName, index));
		}

		var maxSortOrder = await _db.CampaignPosts
			.Where(p => p.CampaignId == request.CampaignId)
			.MaxAsync(p => (int?)p.SortOrder, cancellationToken) ?? -1;

		var post = new CampaignPost
		{
			CampaignId = request.CampaignId,
			CreatedByUserId = request.CallerDomainUserId,
			PostContentJson = string.IsNullOrWhiteSpace(request.PostContentJson) ? null : request.PostContentJson.Trim(),
			SortOrder = maxSortOrder + 1
		};

		foreach (var file in uploadedFiles)
		{
			post.Images.Add(new CampaignPostImage
			{
				StorageKey = file.StorageKey,
				OriginalFileName = file.OriginalFileName,
				SortOrder = file.SortOrder
			});
		}

		_db.CampaignPosts.Add(post);
		await _db.SaveChangesAsync(cancellationToken);

		var dto = new CampaignPostDto(
			post.Id,
			post.PostContentJson,
			post.Images
				.OrderBy(x => x.SortOrder)
				.Select(x => new CampaignPostImageDto(
					x.Id,
					_fileStorage.GetPublicUrl(x.StorageKey),
					x.OriginalFileName,
					x.SortOrder))
				.ToList(),
			post.CreatedAt,
			post.UpdatedAt);

		return ServiceResponse<CampaignPostDto>.Success(dto);
	}
}
