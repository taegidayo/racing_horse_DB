/* 
racing_horse 앱의 DB Main 코드, 실행시 자동으로 매 10시~17시 사이 정각마다 경주결과데이터와 예정 경주계획을 가져옴
*/
import "dotenv/config";
import { get_race_result } from "./race_result.js";
import { get_expected_racing } from "./expected_racing.js";

import { scheduleJob } from "node-schedule";

for (let hour = 10; hour <= 17; hour++) {
  scheduleJob(`0 ${hour} * * *`, get_race_result);
  scheduleJob(`0 ${hour} * * *`, get_expected_racing);
}
