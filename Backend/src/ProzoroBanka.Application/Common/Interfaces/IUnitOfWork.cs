using System.Data;
using Microsoft.EntityFrameworkCore.Storage;

namespace ProzoroBanka.Application.Common.Interfaces;

/// <summary>
/// Unit of Work для управління транзакціями та збереженням.
/// </summary>
public interface IUnitOfWork
{
	/// <summary>
	/// Зберігає всі незбережені зміни.
	/// </summary>
	Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

	/// <summary>
	/// Починає нову транзакцію.
	/// </summary>
	Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);

	/// <summary>
	/// Починає нову транзакцію з певним рівнем ізоляції.
	/// </summary>
	Task<IDbContextTransaction> BeginTransactionAsync(IsolationLevel isolationLevel, CancellationToken cancellationToken = default);

	/// <summary>
	/// Виконує дію в транзакції з автоматичним commit/rollback.
	/// </summary>
	Task<TResult> ExecuteInTransactionAsync<TResult>(
		Func<CancellationToken, Task<TResult>> action,
		CancellationToken cancellationToken = default);

	/// <summary>
	/// Виконує дію в транзакції з автоматичним commit/rollback (без результату).
	/// </summary>
	Task ExecuteInTransactionAsync(
		Func<CancellationToken, Task> action,
		CancellationToken cancellationToken = default);
}
