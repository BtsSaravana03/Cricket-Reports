import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { clientTemplates, generatePdfReport, generatePptxReport } from '@cricket-reports/report-engine';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dynamic Database Connection Handler
let dbInstance = null;
let currentDbPath = '';

export function getDatabaseConnection() {
  if (dbInstance) return dbInstance;

  // Search paths priority:
  // 1. CRICKET_DB_PATH environment variable (if user specified custom path)
  // 2. Local App DB directory
  // 3. System Kadamba default path
  const candidatePaths = [
    process.env.CRICKET_DB_PATH,
    // 'C:/Program Files (x86)/Kadamba/Jukebox_Venue_Setup/DB/Cricket',
    'D:/Program Files (x86)/Kadamba/Jukebox_Venue_Setup/DB/Cricket',
    'C:/Kadamba/Jukebox_Venue_Setup/DB/Cricket',
    'C:\\Program Files (x86)\\Kadamba\\Jukebox_Venue_Setup\\DB\\Cricket',
    'C:\\Kadamba\\Jukebox_Venue_Setup\\DB\\Cricket',
    path.join(__dirname, 'database/Cricket'),
    path.join(__dirname, 'database/cricket_reports.db')
  ].filter(Boolean);

  let selectedPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[candidatePaths.length - 1];
  console.log('[SQLite DB] Connecting to Database File:', selectedPath);
  currentDbPath = selectedPath;

  try {
    dbInstance = new Database(selectedPath, { readonly: true });
    return dbInstance;
  } catch (err) {
    console.error('[SQLite DB] Readonly Connection Failed, retrying default:', err);
    try {
      dbInstance = new Database(selectedPath);
      return dbInstance;
    } catch (err2) {
      console.error('[SQLite DB] Connection Failed:', err2);
      throw err2;
    }
  }
}

export function getData(query, params = []) {
  try {
    const db = getDatabaseConnection();
    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    return { status: 200, data: rows };
  } catch (err) {
    console.error('Database Query Error:', err);
    throw err;
  }
}

export const app = express();
app.use(cors());
app.use(express.json());

// API Health / Config Info
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    dbPath: currentDbPath,
    dbConnected: !!dbInstance
  });
});

// Dynamic Database Path Configuration Endpoint
app.post('/api/config/db-path', (req, res) => {
  try {
    const { newDbPath } = req.body;
    if (!fs.existsSync(newDbPath)) {
      return res.status(404).json({ error: 'Database file not found at specified path' });
    }
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    process.env.CRICKET_DB_PATH = newDbPath;
    getDatabaseConnection();
    res.json({ success: true, dbPath: currentDbPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Auth / Login Route
app.post('/api/login/validate/:username/:password', (req, res) => {
  try {
    const db = getDatabaseConnection();
    const { username, password } = req.params;
    const query = `SELECT * FROM LoginUser WHERE username=? AND password=?`;
    const rows = db.prepare(query).all(username, password);
    const session = crypto.randomBytes(16).toString('base64');
    res.json({ status: 200, data: rows, session });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ status: 500, data: [], error: err.message });
  }
});

// 2. Get Competitions Route
app.get('/api/getCompetitions', (req, res) => {
  try {
    const db = getDatabaseConnection();
    const query = `SELECT * FROM COMPETITIONS`;
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching competitions:', err);
    res.status(500).send('Error fetching competitions');
  }
});

// 3. Get Matches by Competition ID Route
app.get('/api/getMatches/:compid', (req, res) => {
  try {
    const db = getDatabaseConnection();
    const query = `
      SELECT
        M.ID AS ID,
        M.COMPETITIONID AS COMP_ID,
        CA.CLUBNAME AS ClubA,
        CB.CLUBNAME AS ClubB,
        CA.Prefix AS ClubAPrefix,
        CB.Prefix AS ClubBPrefix,
        CA.CLUBNAME || ' v ' || CB.CLUBNAME AS MatchName,
        CA.Prefix || ' v ' || CB.Prefix AS MatchNameShort,
        M.Date,
        CA.CLUBNAME || ' v ' || CB.CLUBNAME || ' - ' ||
        SUBSTR(M.Date, 9, 2) || '/' ||
        SUBSTR(M.Date, 6, 2) || '/' ||
        SUBSTR(M.Date, 1, 4) || ', ' ||
        SUBSTR(M.Date, 12, 5) AS MatchNameDate,
        CA.Prefix || ' v ' || CB.Prefix || ' - ' ||
        SUBSTR(M.Date, 9, 2) || '/' ||
        SUBSTR(M.Date, 6, 2) || '/' ||
        SUBSTR(M.Date, 1, 4) || ', ' ||
        SUBSTR(M.Date, 12, 5) AS MatchNameDateShort,
        INNINGSCOUNT AS InningsCount,
        KNOCKOUT AS KnockOut
      FROM
        MATCH M
        JOIN CLUB CA ON CA.CLUBID = M.CLUBA
        JOIN CLUB CB ON CB.CLUBID = M.CLUBB
      WHERE
        M.COMPETITIONID = ?;
    `;
    const rows = db.prepare(query).all(req.params.compid);
    res.json(rows);
  } catch (err) {
    console.error('Error Fetching Matches:', err);
    res.status(500).send('Error Fetching Matches');
  }
});

// 4. Get Full Match Details
app.get('/api/getMatchDetails/:matchid', async (req, res) => {
  try {
    const matchId = req.params.matchid;
    const q = `SELECT M.*,
       CA.PREFIX || ' v ' || CB.PREFIX AS MatchNameShort,
       CA.PREFIX || ' Vs ' || CB.PREFIX AS MtcVideos,
       CA.CLUBNAME || ' v ' || CB.CLUBNAME AS MatchName,
       MT.isLimitedOvers,
       CA.PREFIX as ClubAPrefix,
       CB.PREFIX as ClubBPrefix,
       CA.ClubName as ClubAFull,
       CB.ClubName as ClubBFull,
       CA.CLUBID as ClubAId,
       CB.CLUBID as ClubBId,
       S.NAME AS StadiumName,
       S.City AS City,
       C.Name AS CompFullName,
       C.CompPrefix,
       MT.InnCount,
       P.FullName AS MomPlayerName
       FROM MATCH M
       JOIN CLUB CA ON CA.CLUBID = M.CLUBA
       JOIN CLUB CB ON CB.CLUBID = M.CLUBB
       JOIN MATCHTYPE MT ON MT.ID = M.MATCHTYPEID
       JOIN COMPETITIONS C ON C.ID = M.CompetitionID
       LEFT JOIN STADIUM S ON S.ID = M.STADIUMID
       LEFT JOIN PLAYERS P ON P.PlayerID = M.MoM
       WHERE M.ID = ?;`;

    const i = `SELECT I.*,CBT.ClubName as BattingClubName,CBT.Prefix as BattingClubPrefix,CBO.ClubName as BowlingClubName,CBO.Prefix as BowlingClubPrefix FROM INNINGS I
    LEFT JOIN CLUB CBT ON CBT.CLUBID = I.BATTINGCLUBID
    LEFT JOIN CLUB CBO ON CBO.CLUBID = I.BOWLINGCLUBID
    WHERE I.MATCHID=? order by inningsid`;

    const r = `SELECT MR.*,C.CLUBNAME as ClubName,C.PREFIX AS ClubPrefix FROM MATCHRESULT MR
    LEFT JOIN CLUB C ON C.clubid=MR.CLUBID
    WHERE MR.MATCHID=?`;

    const info = `SELECT C.Name as Series
    ,C.Season
    ,CA.ClubName || ' v ' || CB.ClubName AS MatchName
    ,S.Name AS Venue
    ,S.City as City
    ,strftime('%H:%M', Date) || ' IST' AS Time
    ,strftime('%Y-%m-%d', Date) AS Date
    ,MatchOvers
    ,MT.Description as Format
    ,TWC.ClubName || ', elected to ' ||case when I.Description='Batting' then 'bat' when I.Description='Fielding' then 'field' end || ' first'  as Toss
    ,O1.FirstName || ' ' || O1.LastName ||', '|| O2.FirstName || ' ' || O2.LastName AS [Umpires]
    ,TVO.FirstName || ' ' || TVO.LastName AS [TV Umpire]
    ,Mref.FirstName || ' ' || Mref.LastName AS [Match Refree]
    FROM Match M
    Left join Stadium S on S.ID=M.StadiumId
    Left join Competitions C on C.ID=M.CompetitionId
    Left join MatchType MT on MT.ID=M.MatchTypeID
    Left join Club CA on CA.Clubid=M.ClubA
    Left join Club CB on CB.Clubid=M.ClubB
    Left join Innings I on I.Matchid=M.Id and  Tosswin=1
    Left join Club TWC on TWC.Clubid=I.WinTeam
    Left join MatchOfficials MO on MO.MatchId=M.Id
    Left join Officials O1 on O1.Id=MO.Official1Id
    Left join Officials O2 on O2.Id=MO.Official2Id
    Left join Officials Mref on Mref.Id=MO.MatchRefId
    Left join Officials TVO on TVO.Id=MO.TVUmpireId
    WHERE M.ID = ?`;

    let result = [];
    const matchResponse = getData(q, [matchId]);
    if (matchResponse?.data?.length > 0) {
      const inningsResponse = getData(i, [matchId]);
      matchResponse.data[0].inningsData = inningsResponse.data || null;
      const matchResult = getData(r, [matchId]);
      matchResponse.data[0].result = matchResult.data || null;
      matchResponse.data[0].MatchComplete = matchResult.data.length > 0;
      const matchInfo = getData(info, [matchId]);
      matchResponse.data[0].info = matchInfo.data[0] || null;
      result = matchResponse.data;
    }
    res.json(result);
  } catch (err) {
    console.error('Error Fetching MatchDetails:', err);
    res.status(500).send('Error Fetching MatchDetails');
  }
});

// 5. Ball-By-Ball API Route (Advanced Query with CTEs)
const ballByBallQuery = `WITH LastBall AS (

SELECT 
    MAX(CASE WHEN Sc.Inningsid=1 THEN SC.BallID END) Firstinnlastball,
    MAX(CASE WHEN Sc.Inningsid=2 THEN SC.BallID END) Secondinnlastball 
FROM Scorecard SC 
WHERE SC.MatchID=?

),

PartnershipCTE AS (

SELECT 
    A.MatchID,
    A.InningsID,
    NULLIF(A.PartnerId,B.PartnerId) AS PartnerId,
    NULLIF(A.Wkt,B.Wkt) AS Wkt,
    NULLIF(B.Overs,0) AS StartOver,
    COALESCE(CAST(B.BallID AS INTEGER)+1,0) AS StartBallID,
    A.Overs AS EndOver,
    A.BallID AS EndBallID

FROM (
    SELECT 
        MatchID,
        InningsID,
        DENSE_RANK() OVER(
            PARTITION BY InningsID 
            ORDER BY Overs,S.BallID
        ) Wkt,
        BallID,
        Overs,
        DismissalTypeID,
        CASE 
            WHEN NonStrikerID > StrikerID 
                THEN StrikerID || '-' || NonStrikerID 
            ELSE NonStrikerID || '-' || StrikerID 
        END AS PartnerId

    FROM Scorecard S 
    WHERE S.MatchID=?  
      AND (
            S.DismissalTypeID NOT IN(7,8,14) 
            OR S.NonBallType IN (9,11) 
            OR (S.InningsID=1 AND BallID IN(select Firstinnlastball from LastBall)) 
            OR (S.InningsID=2 AND S.BallID IN(select Secondinnlastball from LastBall))
      )

) A 
LEFT JOIN (
    SELECT 
        MatchID,
        InningsID,
        DENSE_RANK() OVER(
            PARTITION BY InningsID 
            ORDER BY Overs,S.BallID
        ) Wkt,
        BallID,
        Overs,
        DismissalTypeID,
        CASE 
            WHEN NonStrikerID > StrikerID 
                THEN StrikerID || '-' || NonStrikerID 
            ELSE NonStrikerID || '-' || StrikerID 
        END AS PartnerId

    FROM Scorecard S 
    WHERE S.MatchID=?  
      AND (
            S.DismissalTypeID NOT IN(7,8,14) 
            OR S.NonBallType IN (9,11) 
            OR (S.InningsID=1 AND BallID IN(select Firstinnlastball from LastBall)) 
            OR (S.InningsID=2 AND S.BallID IN(select Secondinnlastball from LastBall))
      )

) B 
    ON A.MatchID=B.MatchID 
    AND A.InningsID=B.InningsID 
    AND A.Wkt=B.Wkt+1

),

/* ============================================================
   SQLite replacement for FN_GetWagonWheelPosition
   ============================================================ */

WWPosition AS (

    SELECT
        S.MatchID,
        S.InningsID,
        S.BallID,

        CASE

            /* ---------------- INNER CIRCLE : 1 - 8 ---------------- */

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (115 * 115)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 < 0
            AND S.WagonWheelX - 298 >= ABS(S.WagonWheelY - 284)
                THEN 2

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (115 * 115)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 < 0
            AND S.WagonWheelX - 298 < ABS(S.WagonWheelY - 284)
                THEN 1

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (115 * 115)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 >= 0
            AND S.WagonWheelX - 298 >= S.WagonWheelY - 284
                THEN 3

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (115 * 115)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 >= 0
            AND S.WagonWheelX - 298 < S.WagonWheelY - 284
                THEN 4

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (115 * 115)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 >= 0
            AND ABS(S.WagonWheelX - 298) >= S.WagonWheelY - 284
                THEN 6

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (115 * 115)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 >= 0
            AND ABS(S.WagonWheelX - 298) < S.WagonWheelY - 284
                THEN 5

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (115 * 115)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 < 1
            AND ABS(S.WagonWheelX - 298) >= ABS(S.WagonWheelY - 284)
                THEN 7

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (115 * 115)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 < 1
            AND ABS(S.WagonWheelX - 298) < ABS(S.WagonWheelY - 284)
                THEN 8


            /* ---------------- SECOND CIRCLE : 9 - 16 ---------------- */

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (115 * 115)
            AND (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (202 * 202)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 < 0
            AND S.WagonWheelX - 298 > ABS(S.WagonWheelY - 284)
                THEN 10

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (115 * 115)
            AND (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (202 * 202)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 < 0
            AND S.WagonWheelX - 298 <= ABS(S.WagonWheelY - 284)
                THEN 9

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (115 * 115)
            AND (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (202 * 202)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 >= 0
            AND S.WagonWheelX - 298 > S.WagonWheelY - 284
                THEN 11

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (115 * 115)
            AND (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (202 * 202)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 >= 0
            AND S.WagonWheelX - 298 <= S.WagonWheelY - 284
                THEN 12

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (115 * 115)
            AND (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (202 * 202)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 >= 0
            AND ABS(S.WagonWheelX - 298) > S.WagonWheelY - 284
                THEN 14

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (115 * 115)
            AND (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (202 * 202)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 >= 0
            AND ABS(S.WagonWheelX - 298) <= S.WagonWheelY - 284
                THEN 13

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (115 * 115)
            AND (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (202 * 202)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 < 1
            AND ABS(S.WagonWheelX - 298) > ABS(S.WagonWheelY - 284)
                THEN 15

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (115 * 115)
            AND (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) <= (202 * 202)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 < 1
            AND ABS(S.WagonWheelX - 298) <= ABS(S.WagonWheelY - 284)
                THEN 16


            /* ---------------- OUTER CIRCLE : 17 - 24 ---------------- */

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (202 * 202)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 < 0
            AND S.WagonWheelX - 298 >= ABS(S.WagonWheelY - 284)
                THEN 18

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (202 * 202)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 < 0
            AND S.WagonWheelX - 298 < ABS(S.WagonWheelY - 284)
                THEN 17

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (202 * 202)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 >= 0
            AND S.WagonWheelX - 298 >= S.WagonWheelY - 284
                THEN 19

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (202 * 202)
            AND S.WagonWheelX - 298 >= 0
            AND S.WagonWheelY - 284 >= 0
            AND S.WagonWheelX - 298 < S.WagonWheelY - 284
                THEN 20

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (202 * 202)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 >= 0
            AND ABS(S.WagonWheelX - 298) >= S.WagonWheelY - 284
                THEN 22

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (202 * 202)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 >= 0
            AND ABS(S.WagonWheelX - 298) < S.WagonWheelY - 284
                THEN 21

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (202 * 202)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 < 1
            AND ABS(S.WagonWheelX - 298) >= ABS(S.WagonWheelY - 284)
                THEN 23

            WHEN (
                (S.WagonWheelX - 298) * (S.WagonWheelX - 298) +
                (S.WagonWheelY - 284) * (S.WagonWheelY - 284)
            ) > (202 * 202)
            AND S.WagonWheelX - 298 < 0
            AND S.WagonWheelY - 284 < 1
            AND ABS(S.WagonWheelX - 298) < ABS(S.WagonWheelY - 284)
                THEN 24

            ELSE 0

        END AS Position

    FROM SCORECARD S
    WHERE S.MATCHID=?
)

SELECT S.*,ST.FULLNAME as StrikerName,NST.FULLNAME AS NonStrikerName,BR.FULLNAME AS BowlerName,I.BattingClubID,I.BowlingClubID,CBTC.ClubName AS BattingClubName,CBTC.Prefix AS BattingClubPrefix,DF.FULLNAME as DismissalFielder1Name
               ,DF2.FullName AS DismissalFielder2Name
               ,SUM(S.RUNS + S.EXTRAS+ IFNULL(p.Penalty, 0) + S.BLExtras) OVER(PARTITION BY S.MATCHID,S.INNINGSID ORDER BY s.OVERS,S.BALLID) AS TeamRuns
               ,SUM(S.Dismissal) OVER(PARTITION BY S.MATCHID,S.INNINGSID ORDER BY s.OVERS,S.BALLID) AS TeamWickets
               ,S.RUNS + CASE WHEN EXTRATYPEID IN (1,2,5) THEN S.EXTRAS ELSE 0 END Bowlruns
               ,CASE WHEN EXTRATYPEID NOT IN (1,2,5) THEN 1 ELSE 0 END Bowlballs
               ,CASE WHEN DISMISSALTYPEID NOT IN (4,7,8,14,10,0) THEN 1 ELSE 0 END Bowlwkts
               ,CASE WHEN S.EXTRATYPEID NOT IN(2) THEN 1 ELSE 0 END AS Batballs
               ,S.RUNS Batruns,DB.FullName AS DismissedBatterName
               ,F.FullName as FielderName
               ,CASE WHEN DISMISSALTYPEID NOT IN (4,7,8,14,10,0) THEN 1 ELSE 0 END Batwkts
               ,(select SUM(CASE WHEN (bowlruns=0 and endover=1 and (bowlballs=7  or bowlballs=6 or bowlballs=5)) THEN 1 ELSE 0 END)
                   from (select MatchId,InningsId,s.OverId,Max(Endover)Endover
                         ,Sum(RUNS + CASE WHEN EXTRATYPEID IN (1,2,5) THEN EXTRAS ELSE 0 END) as BowlRuns
                         ,Sum(CASE WHEN EXTRATYPEID NOT IN (1,2,5) THEN 1 ELSE 0 END) Bowlballs
                         from Scorecard s where MATCHID=? Group by  MatchId,InningsId,s.OverId
                         )V where S.MatchID=V.MatchID and S.InningsID=V.InningsID and S.OverID=V.OverID  Group by  MatchId,InningsId,OverId ) as [Maiden]
               ,BS.DisplayName AS DeliveryStyleName
               ,BS.SpinOrPace
               ,SK.DisplayName AS StrokeName
               ,DT.Description AS DismissalTypeDesc
               ,case when S.Nonstrikerid  > S.strikerid  then cast(S.strikerid as varchar(10))||'-'||cast(S.Nonstrikerid as varchar(10)) else cast(S.Nonstrikerid as varchar(10))||'-'||cast(S.strikerid as varchar(10)) end Partnerid
               ,cast((179 - PM_X) / 1.494  as int)PM_X_CM
               ,cast(ROUND(CASE WHEN PM_Y >= 960 THEN PM_Y
                           ELSE  CASE WHEN ((-0.8073 + SQRT((0.65173329 ) - 4 * 0.0000991 * (97.5874 - PM_Y))) / (2 * 0.0000991)) < 450
                                      THEN ((-0.8073 + SQRT((0.65173329) - 4 * 0.0000991 * (97.5874 - PM_Y))) / (2 * 0.0000991)) - 7
                                 ELSE (-0.8073 + SQRT((0.65173329) - 4 * 0.0000991 * (97.5874 - PM_Y))) / (2 * 0.0000991)
                                 END
                           END,  1) as int) as PM_Y_CM
               ,ABS(180 - ((2 * 3.14159265359) - ATAN2((WagonWheelX - 300), (WagonWheelY - 259))) * (180 / 3.14159265359)) as WW_Angle
               ,ROUND(SQRT((S.WagonWheelX - 300) * (S.WagonWheelX - 300) + (S.WagonWheelY - 300) * (S.WagonWheelY - 300)), 0) AS WW_Distance
 		           ,ROUND((SQRT((S.WagonWheelX - 300) * (S.WagonWheelX - 300) + (S.WagonWheelY - 300) * (S.WagonWheelY - 300)) / 258) * 100, 2) AS WW_DistancePercentage
              ,CASE
                  WHEN WWP.Position IN (1,2,9,10,17,18) THEN 1
                  WHEN WWP.Position IN (3,11,19) THEN 2
                  WHEN WWP.Position IN (4,12,20) THEN 3
                  WHEN WWP.Position IN (5,13,21) THEN 4
                  WHEN WWP.Position IN (6,14,22) THEN 5
                  WHEN WWP.Position IN (7,8,15,16,23,24) THEN 6
              END AS WWRegion_6

              ,
              CASE
                  WHEN WWP.Position IN (1,9,17) THEN 1
                  WHEN WWP.Position IN (2,10,18) THEN 2
                  WHEN WWP.Position IN (3,11,19) THEN 3
                  WHEN WWP.Position IN (4,12,20) THEN 4
                  WHEN WWP.Position IN (5,13,21) THEN 5
                  WHEN WWP.Position IN (6,14,22) THEN 6
                  WHEN WWP.Position IN (7,15,23) THEN 7
                  WHEN WWP.Position IN (8,16,24) THEN 8
              END AS WWRegion_8

              ,
              CASE
                  WHEN WWP.Position IN (1,9) THEN 1
                  WHEN WWP.Position IN (2,10) THEN 2
                  WHEN WWP.Position IN (3,11) THEN 3
                  WHEN WWP.Position IN (4,12) THEN 4
                  WHEN WWP.Position IN (5,13) THEN 5
                  WHEN WWP.Position IN (6,14) THEN 6
                  WHEN WWP.Position IN (7,15) THEN 7
                  WHEN WWP.Position IN (8,16) THEN 8
                  WHEN WWP.Position = 17 THEN 9
                  WHEN WWP.Position = 18 THEN 10
                  WHEN WWP.Position = 19 THEN 11
                  WHEN WWP.Position = 20 THEN 12
                  WHEN WWP.Position = 21 THEN 13
                  WHEN WWP.Position = 22 THEN 14
                  WHEN WWP.Position = 23 THEN 15
                  WHEN WWP.Position = 24 THEN 16
              END AS WWRegion_16
               ,cast(Round((305 - SZ_X) / 1.35,0) as int)  as SZ_X_CM
               ,cast(ROUND(((405 - SZ_Y) * 71) / 90,0)  as int)  as SZ_Y_CM
               ,ST.BattingTypeID as StBattingTypeID
               ,BR.BowlingTypeID as BwBowlingTypeID
               ,CMT.DisplayName AS CreaseMovementName
               ,BSM.Description as BatSubjectName
               ,ST.BattingTypeID AS BatTypeID
               ,I.VideoMode AS InVideoMode
               ,I.VideoPath As InVideoPath
               ,BO.BattingOrder AS BatOrder
               ,MT.MatchTypeID AS MatchTypeID
               ,NBD.FullName as NonBallDismissalBatter
               ,Case when TB.Over=S.Overid then true else false end  as MultipleBowlers
               , CASE WHEN MT.MatchTypeID IN (2,5,9,12,15,18,21,36) THEN
                    CASE
                        WHEN S.OverID >= 1 AND S.OverID <= 10 THEN '01-10'
                        WHEN S.OverID >= 11 AND S.OverID <= 20 THEN '11-20'
                        WHEN S.OverID >= 21 AND S.OverID <= 30 THEN '21-30'
                        WHEN S.OverID >= 31 AND S.OverID <= 40 THEN '31-40'
                        WHEN S.OverID >= 41 AND S.OverID <= 50 THEN '41-50'
                    END
                WHEN MT.MatchTypeID IN (3,6,10,13,16,19,22,28,31,34,39,40,45,53,54) THEN
                    CASE
                        WHEN S.OverID >= 1 AND S.OverID <= 6 THEN '01-06'
                        WHEN S.OverID >= 7 AND S.OverID <= 10 THEN '07-10'
                        WHEN S.OverID >= 11 AND S.OverID <= 15 THEN '11-15'
                        WHEN S.OverID >= 16 AND S.OverID <= 20 THEN '16-20'
                    END
            END AS PhaseofPlay,NULLIF(PNSp.WKT,0) as PartnerWktOrder
            ,CASE WHEN ',' || S.Batsman || ',' LIKE '%,5,%' THEN 1 
              ELSE 0 
            END AS Uncomfortable,ifnull(p.Penalty,0) as Penalty1 , AT.LengthX as PM_X_CM_Hauk,AT.LengthY as PM_Y_CM_Hauk, AT.HeightX as SZ_X_CM_Batter, AT.HeightY as SZ_Y_CM_Batter, AT.StumpHeightX as SZ_X_CM_Stump, AT.StumpHeightY as SZ_Y_CM_Stump,AT.CreaseHeightX as SZ_X_CM_crease, AT.CreaseHeightY as SZ_Y_CM_Crease,AT.RPX AS RPX_H,AT.RPY AS RPY_H, AT.Swing  AS Swing_H, AT.Deviation AS Deviation_H, AT.ReactionTime_to_Crease AS ReactionTime_to_Crease_H, AT.ReactionTime_to_interception AS ReactionTime_to_interception_H,AT.IPX_CM AS IPX_CM_H,ABS(ROUND(405 - ((NULLIF(AT.HeightY,-99990) * 90) / 71),0))  AS IPY_CM_H, AT.ReleaseSpeed AS ReleaseSpeed ,AT.StumpHeightY AS BounsHeight,AT.DIP AS Dip
            ,CASE WHEN S.BatSubject=5 or S.BatSubject like '%5%' OR S.ShotConnection IN (1,2,3,4,5,11,12)  THEN 1 ELSE 0 END AS [FS]
            FROM SCORECARD S
             LEFT JOIN PLAYERS ST on ST.PLAYERID=S.STRIKERID
             LEFT JOIN PLAYERS NST ON NST.PLAYERID = S.NONSTRIKERID
             LEFT JOIN PLAYERS BR ON BR.PLAYERID = S.BOWLERID
             LEFT JOIN PLAYERS DF ON DF.PLAYERID = S.DISMISSALFIELDERID1
             LEFT JOIN PLAYERS DF2 ON DF.PLAYERID = S.DISMISSALFIELDERID2
             LEFT JOIN PLAYERS F ON F.PLAYERID = S.FielderID
             LEFT JOIN PLAYERS DB ON DB.PlayerID = S.DismissedBatter
             LEFT JOIN PLAYERS NBD ON NBD.PlayerID = S.NonBall_dismissBatter
             LEFT JOIN BOWLINGSTYLE BS ON BS.Id = S.DeliveryStyle
             LEFT JOIN STROKE SK ON SK.ID = S.STROKETYPE
             LEFT JOIN DISMISSALTYPE DT ON DT.ID = S.DismissalTypeID
             LEFT JOIN CREASEMOVEMENT CMT ON CMT.Id = S.CreaseMovement
             LEFT JOIN BATSUBJECTMASTER BSM ON BSM.Id = S.BatSubject
             LEFT JOIN BATTINGORDER BO ON BO.MatchID = S.MatchId AND BO.InningsID=S.InningsId AND BO.PlayerID = S.StrikerID
             JOIN MATCH MT ON MT.ID = S.MATCHID
             LEFT JOIN STADIUM STD ON STD.ID = MT.StadiumID
             JOIN INNINGS I ON I.INNINGSID = S.INNINGSID AND I.MATCHID = S.MATCHID
             LEFT JOIN CLUB CBTC ON CBTC.CLUBID = I.BATTINGCLUBID
             left JOIN Penalty p ON p.INNINGSID = S.INNINGSID AND p.MATCHID = S.MATCHID and p.overs = s.Overs
             LEFT JOIN (select MatchId,Inningsid,s.Overid Over from SCorecard s where MatchId=? Group by MatchId,Inningsid,Overid having COunt(distinct Bowlerid)>1) TB on TB.Matchid=S.MatchId and S.Inningsid=TB.Inningsid and S.Overid=TB.Over
             LEFT JOIN PartnershipCTE PNSP on PNSP.Matchid=S.MatchId and PNSP.InningsID=S.InningsID AND S.BallID BETWEEN Coalesce(PNSP.StartBallID,0) AND Coalesce(PNSP.EndBallID,0)
             LEFT JOIN Advancetracking AT on AT.MatchID = S.MatchId and AT.BallID = S.BALLID and AT.InningsID =  S.INNINGSID 
             LEFT JOIN WWPosition WWP ON WWP.MatchID = S.MATCHID AND WWP.InningsID = S.INNINGSID AND WWP.BallID = S.BALLID
  WHERE S.MATCHID=? ORDER BY S.INNINGSID ASC,S.OverId,S.Overs,S.BALLID ASC;`;

app.get('/api/ballbyball/:matchid', (req, res) => {
  try {
    const db = getDatabaseConnection();
    const matchId = req.params.matchid;
    const params = [matchId, matchId, matchId, matchId, matchId, matchId, matchId];
    const rows = db.prepare(ballByBallQuery).all(...params);
    res.json({
      status: 200,
      data: rows
    });
  } catch (err) {
    console.error('Error Fetching BallByBall:', err);
    res.status(500).send('Error Fetching BallByBall');
  }
});

// Client Templates List
app.get('/api/templates', (req, res) => {
  res.json(Object.values(clientTemplates));
});

// Generate Report Download Endpoint
app.post('/api/reports/generate', async (req, res) => {
  try {
    const db = getDatabaseConnection();
    const { matchId, templateId = 'vca', reportType = 'vca-batter', teamId, batterId, format = 'pdf' } = req.body;

    const matchDetailsRows = db.prepare(`
      SELECT M.*, CA.CLUBNAME as ClubAFull, CB.CLUBNAME as ClubBFull, S.Name as StadiumName, C.Name as CompFullName
      FROM MATCH M
      LEFT JOIN CLUB CA ON CA.CLUBID = M.CLUBA
      LEFT JOIN CLUB CB ON CB.CLUBID = M.CLUBB
      LEFT JOIN STADIUM S ON S.ID = M.STADIUMID
      LEFT JOIN COMPETITIONS C ON C.ID = M.COMPETITIONID
      WHERE M.ID = ?
    `).all(matchId);

    const matchInfo = matchDetailsRows[0] || {};
    const balls = db.prepare(ballByBallQuery).all(matchId, matchId, matchId, matchId, matchId, matchId);

    const batterStatsMap = {};
    balls.forEach(b => {
      const batterName = b.StrikerName || 'Batter';
      if (!batterStatsMap[batterName]) {
        batterStatsMap[batterName] = {
          playerName: batterName,
          batterId: b.StrikerID,
          batStyle: b.StBattingTypeID === 2 ? 'LEFT HAND BATSMAN' : 'RIGHT HAND BATSMAN',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dismissal: 'not out'
        };
      }
      const stat = batterStatsMap[batterName];
      if (b.Batballs) stat.balls += 1;
      stat.runs += (b.Batruns || 0);
      if (b.Batruns === 4) stat.fours += 1;
      if (b.Batruns === 6) stat.sixes += 1;
      if (b.DismissalTypeDesc) stat.dismissal = `${b.DismissalTypeDesc} b ${b.BowlerName || ''}`;
    });

    const battingStats = Object.values(batterStatsMap).map(b => ({
      ...b,
      strikeRate: b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(2) : '0.00'
    }));

    const matchData = {
      reportType,
      teamId,
      batterId,
      teamA: matchInfo.ClubAFull || 'Team A',
      teamB: matchInfo.ClubBFull || 'Team B',
      venue: matchInfo.StadiumName || 'Stadium',
      matchDate: matchInfo.Date || '2026-09-22',
      competitionName: matchInfo.CompFullName || 'Tournament',
      result: 'Match Completed',
      battingStats
    };

    if (format === 'pptx') {
      const buffer = await generatePptxReport(matchData, templateId);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename=Report_${reportType}_${matchId}.pptx`);
      return res.send(buffer);
    } else {
      const pdfBuffer = await generatePdfReport(matchData, templateId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Report_${reportType}_${matchId}.pdf`);
      return res.send(pdfBuffer);
    }
  } catch (err) {
    console.error('Report Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Proxy route for Graphics API pitchmap
app.post('/api/graphics/pitchmap', async (req, res) => {
  try {
    const apiRes = await fetch('https://cloud.cricket-21.com/GraphicsApi/api/pitchmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const text = await apiRes.text();
    res.status(apiRes.status).send(text);
  } catch (err) {
    console.error('Graphics pitchmap proxy error:', err);
    res.status(500).send('Error proxying pitchmap');
  }
});

// Proxy route for Graphics API wwregion
app.post('/api/graphics/wwregion', async (req, res) => {
  try {
    const apiRes = await fetch('https://cloud.cricket-21.com/GraphicsApi/api/wwregion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const text = await apiRes.text();
    res.status(apiRes.status).send(text);
  } catch (err) {
    console.error('Graphics wwregion proxy error:', err);
    res.status(500).send('Error proxying wwregion');
  }
});

