import Airtable from "airtable";

const base = new Airtable({
  apiKey:
    "pat9e5Ssiv7agjERW.9549a7cb82474b24e77d2285ca91fc3de4ef6819b398e1c7be3321a65e0bdbf9",
}).base("app054uJcxxiTUK7p"); // You'll need to replace this with your actual base ID

export const table = base("tblY7oFqsMB7nYorj");
export const emailTemplatesTable = base("EmailTemplate"); // Updated to match your Airtable table name
export default base;
