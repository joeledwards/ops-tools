module.exports = awsAction => {
  return (options) => {
    return new Promise((resolve, reject) => {
      awsAction(options, (error, data) => {
        if (error) {
          reject(error)
        } else {
          resolve(data)
        }
      })
    })
  }
}
