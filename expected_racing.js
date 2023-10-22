import { MongoClient } from "mongodb";
import "dotenv/config";

/**
 * 예정된 경주 계획을 가져오는 함수
 */
export async function get_expected_racing(type = 0) {
  var today = new Date();

  const client = new MongoClient(process.env.MONGO_URL);

  var json = [];

  const apiUrls =
    "https://apis.data.go.kr/B551015/API26_1/entrySheet_1?serviceKey=";

  var coll_name = ["expected_racing_summary", "expected_racing_detail"];

  today.setDate(today.getDate());
  for (var i = 0; i < 7; i++) {
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

      pageNo += 1;

      if (pageNo >= data["response"]["body"]["totalCount"] / 100) {
        if (meet == 3) {
          isRemain = false;
        } else meet += 1;

        pageNo = 1;
      }
    }
    today.setDate(today.getDate() + 1);
  }

  try {
    const database = client.db("project_hr");

    var col = database.collection(coll_name[0]);
    var col2 = database.collection(coll_name[1]);
    col.deleteMany({});
    col2.deleteMany({});

    const resultMap = {};

    json.forEach((item) => {
      const key = `${item.rcDate}-${item.stTime}-${item.meet}`;
      if (!resultMap[key]) {
        resultMap[key] = {
          rcDate: item.rcDate,
          stTime: item.stTime,
          meet: item.meet,
          rcDay: item.rcDay,
          rank: item.rank,
          rcDist: item.rcDist,
          rcNo: item.rcNo,
          horses: [],
        };
      }
      resultMap[key].horses.push(item.hrName);
    });

    const resultArray = Object.values(resultMap);

    col.insertMany(resultArray);

    col2.insertMany(json);
  } finally {
    await client.close();
  }
}
