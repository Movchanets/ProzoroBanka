using FluentValidation;
using MediatR;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Application.Organizations.DTOs;

namespace ProzoroBanka.Application.Organizations.Commands.UploadOrganizationLogo;

public record UploadOrganizationLogoCommand(
	Guid CallerDomainUserId,
	Guid OrganizationId,
	Stream FileStream,
	string FileName,
	string ContentType,
	long FileSize) : IRequest<ServiceResponse<OrganizationDto>>;

public class UploadOrganizationLogoCommandValidator : AbstractValidator<UploadOrganizationLogoCommand>
{
	private static readonly string[] AllowedContentTypes =
		["image/jpeg", "image/png", "image/webp", "image/gif"];

	public UploadOrganizationLogoCommandValidator()
	{
		RuleFor(x => x.CallerDomainUserId).NotEmpty();
		RuleFor(x => x.OrganizationId).NotEmpty();

		RuleFor(x => x.FileName)
			.NotEmpty().WithMessage("Файл логотипу обов'язковий");

		RuleFor(x => x.FileSize)
			.GreaterThan(0).WithMessage("Файл логотипу обов'язковий")
			.LessThanOrEqualTo(5 * 1024 * 1024).WithMessage("Максимальний розмір логотипу — 5 MB");

		RuleFor(x => x.ContentType)
			.Must(ct => AllowedContentTypes.Contains(ct, StringComparer.OrdinalIgnoreCase))
			.WithMessage("Підтримуються лише JPEG, PNG, WEBP або GIF");
	}
}
