const newCheck = body => {
  if (!body.name || !body.url) {
    throw new Error('expected request body to match {name, url}');
  }
  return body;
};

export default newCheck;
