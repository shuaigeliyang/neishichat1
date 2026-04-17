export function errorHandler(
  err,
  req,
  res,
  next
) {
  console.error('Error:', err)

  const response = {
    success: false,
    error: err.message || 'Internal server error',
  }

  res.status(500).json(response)
}
