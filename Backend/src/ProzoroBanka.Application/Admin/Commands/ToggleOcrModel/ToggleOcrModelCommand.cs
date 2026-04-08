using MediatR;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.Application.Admin.Commands.ToggleOcrModel;

public record ToggleOcrModelCommand(
	Guid Id,
	bool? IsActive,
	bool? IsDefault) : IRequest<ServiceResponse<Guid>>;

public class ToggleOcrModelHandler : IRequestHandler<ToggleOcrModelCommand, ServiceResponse<Guid>>
{
	private readonly IApplicationDbContext _db;

	public ToggleOcrModelHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<Guid>> Handle(ToggleOcrModelCommand request, CancellationToken ct)
	{
		var entity = await _db.OcrModelConfigs.FirstOrDefaultAsync(m => m.Id == request.Id, ct);
		if (entity is null)
			return ServiceResponse<Guid>.Failure("Model not found");

		if (request.IsDefault.HasValue && request.IsDefault.Value)
		{
			var defaults = await _db.OcrModelConfigs.Where(m => m.IsDefault && m.Id != request.Id).ToListAsync(ct);
			foreach (var d in defaults) d.IsDefault = false;
			entity.IsDefault = true;
			entity.IsActive = true; // Default must be active
		}
		else if (request.IsDefault.HasValue && !request.IsDefault.Value)
		{
			entity.IsDefault = false;
		}

		if (request.IsActive.HasValue)
		{
			entity.IsActive = request.IsActive.Value;
			if (!entity.IsActive && entity.IsDefault)
				entity.IsDefault = false; // Cannot be default if inactive
		}

		await _db.SaveChangesAsync(ct);

		return ServiceResponse<Guid>.Success(entity.Id);
	}
}
