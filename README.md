# feedbackAnalysis

REQUIRED:

Need the MS forms...It would be very helpful

INPUT/OUTPUT:

Input: Forms(???), Excel sheet
Output: FeedbackReport.pdf, A dashboard maybe(???)

How scores are calculated??? -> Scores are wrong in Jordan's

SCORE CALCULATION:

numerator = (no.of excellent)*(5) + (no.of very good)*(4) + (no.of good)*(3) + (no.of avg)*(2) + (no.of poor)*(1)
denom = (no.of trainees/total no.of responses)*5

overall rating out of 5 = (numerator/denom)*5

VARIABLES REQUIRED:

ReportTitle(eg: ILP - Angular Final Feedback Analysis)
batchName
totalTraineeCount
tainerName
Overall Program Rating - Out of 5

QuestionTitleColumns
RatingSplitsForEachQuestion
totalRespondedTrainees

CommentsByTrainees(May be AI can be used)

THINGS INTENDED/EXPECTED FROM CLIENT(JORDAN) AS A DEVELOPER:

DESIGN:

Normal
For scores -> Adjustable table

Last part: A GenAI thing

Things to remember: It need not be a A4 sheet thing...

CHALLENGES IN THE PROJECT:

* Basically there are two types of forms
    1. Form for single trainer(Questions available)
    2. Form for multiple trainers(No questions in the excel sheet)
        -> For this form, how do I get the questions as a web app???