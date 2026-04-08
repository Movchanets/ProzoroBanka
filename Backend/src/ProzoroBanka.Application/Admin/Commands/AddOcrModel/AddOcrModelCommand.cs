using MediatR;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;

namespace ProzoroBanka.Application.Admin.Commands.AddOcrModel;

public record AddOcrModelCommand(
	string Name,
	string ModelIdentifier,
	string Provider,
	bool IsActive,
	bool IsDefault) : IRequest<ServiceResponse<Guid>>;

public class AddOcrModelHandler : IRequestHandler<AddOcrModelCommand, ServiceResponse<Guid>>
{
	private readonly IApplicationDbContext _db;

	public AddOcrModelHandler(IApplicationDbContext db)
	{
		_db = db;
	}

	public async Task<ServiceResponse<Guid>> Handle(AddOcrModelCommand request, CancellationToken ct)
	{
		if (request.IsDefault)
		{
			var defaults = _db.OcrModelConfigs.Where(m => m.IsDefault);
			foreach (var d in defaults) d.IsDefault = false;
		}

		var entity = new OcrModelConfig
		{
			Id = Guid.NewGuid(),
			Name = request.Name,
			ModelIdentifier = request.ModelIdentifier,
			Provider = request.Provider,
			IsActive = request.IsActive,
			IsDefault = request.IsDefault
		};

		_db.OcrModelConfigs.Add(entity);
		await _db.SaveChangesAsync(ct);

		return ServiceResponse<Guid>.Success(entity.Id);
	}
}
