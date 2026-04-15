const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

async function run() {
  try {
    const form = new FormData();
    form.append("code", "TEST1234");
    form.append("name", "Test Product");
    form.append("category", "pyjama");
    form.append("season", "summer");
    form.append("buyPrice", "10");
    form.append("price", "20");
    form.append("stock", "5");
    form.append("color", "red");
    form.append("color", "blue");
    form.append("size", "M");
    form.append("size", "L");
    // Let's create a dummy file
    fs.writeFileSync("dummy.jpg", "hello");
    form.append("defaultImage", fs.createReadStream("dummy.jpg"));
    form.append("subImage", fs.createReadStream("dummy.jpg"));

    // We only send it up to getting the error to see what multer complains about
    const res = await axios.post("https://el-mawardy-store.vercel.app/product", form, {
      headers: {
        ...form.getHeaders(),
      }
    });
    console.log(res.data);
  } catch (e) {
    if (e.response) {
      console.log("Error details:", JSON.stringify(e.response.data, null, 2));
    } else {
      console.log("Error:", e.message);
    }
  }
}

run();
