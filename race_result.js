import { MongoClient } from "mongodb";
import "dotenv/config";

/**
 * 진행된 경주의 결과를 가져오는 함수
 */
export async function get_race_result() {
  var today = new Date();
  today.setDate(today.getDate() - i);
  const client = new MongoClient(process.env.MONGO_URL);
  const options = {
    weekday: "short",
  };

  var json = [];

  const apiUrls =
    "https://apis.data.go.kr/B551015/API299/Race_Result_total?serviceKey=";
  var coll_name = ["racing_result_summary", "racing_result"];

  var formattedToday = `${today.getFullYear().toString()}${String(
    today.getMonth() + 1
  ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  var pageNo = 1;
  var meet = 1;
  var isRemain = true;

  while (isRemain) {
    var url =
      apiUrls +
      process.env.API_KEY +
      "&pageNo=" +
      pageNo +
      "&numOfRows=100&_type=json&meet=" +
      meet +
      "&rc_date=" +
      formattedToday;

    console.log(url);
    var response = await fetch(url);
    var data = await response.json();

    if (data["response"]["body"]["totalCount"] == 0) {
      if (meet < 3) {
        meet++;
        continue;
      } else break;
    }
    if (json == []) {
      json = data["response"]["body"]["items"]["item"];
    } else {
      json = [...json, ...data["response"]["body"]["items"]["item"]];
    }

    pageNo++;
    if (pageNo >= data["response"]["body"]["totalCount"] / 100) {
      if (meet == 3) {
        isRemain = false;
      } else meet += 1;

      pageNo = 1;
    }
  }

  try {
    const database = client.db("project_hr");

    var col = database.collection(coll_name[0]);
    var col2 = database.collection(coll_name[1]);
    const resultMap = {};
    col.deleteMany({
      rcDate: parseInt(formattedToday),
    });

    col2.deleteMany({
      rcDate: parseInt(formattedToday),
    });

    if (json.length != 0) {
      json.forEach((item) => {
        const key = `${item.rcDate}-${item.stTime}-${item.meet}`;
        if (!resultMap[key]) {
          resultMap[key] = {
            rcDate: item.rcDate,
            stTime: item.stTime,
            meet: item.meet,
            rank: item.rank,
            rcNo: item.rcNo,
            day: new Intl.DateTimeFormat("ko-KR", options).format(today),
            horses: [],
          };
        }
        resultMap[key].horses.push(item.hrName);
      });
      const resultArray = Object.values(resultMap);

      col.insertMany(resultArray);

      col2.insertMany(json);
    }

    today.setDate(today.getDate() - 9);
    formattedToday = `${today.getFullYear().toString()}${String(
      today.getMonth() + 1
    ).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

    col.deleteMany({
      rcDate: parseInt(formattedToday),
    });
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
