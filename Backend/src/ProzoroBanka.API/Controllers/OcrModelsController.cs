using Microsoft.AspNetCore.Mvc;
using MediatR;
using ProzoroBanka.Application.OcrModels.DTOs;
using ProzoroBanka.Application.OcrModels.Queries.GetActiveOcrModels;

namespace ProzoroBanka.API.Controllers;

[Route("api/ocr/models")]
public class OcrModelsController : ApiControllerBase
{
	private readonly ISender _sender;

	public OcrModelsController(ISender sender)
	{
		_sender = sender;
	}

	/// <summary>
	/// Отримати список активних OCR моделей (для випадаючого списку у клієнті).
	/// </summary>
	[HttpGet]
	[ProducesResponseType(typeof(List<OcrModelConfigDto>), 200)]
	public async Task<IActionResult> GetActive(CancellationToken ct)
	{
		var result = await _sender.Send(new GetActiveOcrModelsQuery(), ct);
		return Ok(result.Payload);
	}
}
