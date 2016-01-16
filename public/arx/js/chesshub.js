$( document ).ready(function() {

    var username;
    if($("#loggedUser").length) {
        username = $("#loggedUser").data("user");
    } else {
        username = "Anonymous";
    }

    var socket = io('http://chesshub-benas.rhcloud.com', { query: 'user=' + username });
    var tvSocket = io('http://chesshub-benas.rhcloud.com/tv');
    var monitorSocket = io('http://chesshub-benas.rhcloud.com/monitor');

    if ($("#pod").length) {
        var pod = new ChessBoard('pod', $("#pod").data('fen'));
        $('#podSolution').popover();
    }

    if ($("#loginError").length && !$("#loginError").is(':empty')) {

        Messenger({
            extraClasses: 'messenger-fixed messenger-on-right messenger-on-top'
        }).post({
            message: $("#loginError").html(),
            type: 'error',
            showCloseButton: true,
            hideAfter: 10
        });
    }

    if ($("#registerError").length && !$("#registerError").is(':empty')) {

        Messenger({
            extraClasses: 'messenger-fixed messenger-on-right messenger-on-top'
        }).post({
            message: $("#registerError").html(),
            type: 'error',
            showCloseButton: true,
            hideAfter: 10
        });
    }

    if ($("#logoutSuccess").length && !$("#logoutSuccess").is(':empty')) {

        Messenger({
            extraClasses: 'messenger-fixed messenger-on-right messenger-on-top'
        }).post({
            message: $("#logoutSuccess").html(),
            type: 'success',
            showCloseButton: true,
            hideAfter: 10
        });
    }

    if ($("#registerSuccess").length && !$("#registerSuccess").is(':empty')) {

        Messenger({
            extraClasses: 'messenger-fixed messenger-on-right messenger-on-top'
        }).post({
                message: $("#registerSuccess").html(),
                type: 'success',
                showCloseButton: true,
                hideAfter: 10
            });
    }

    if ($("#welcomeMessage").length && !$("#welcomeMessage").is(':empty')) {

        Messenger({
            extraClasses: 'messenger-fixed messenger-on-right messenger-on-top'
        }).post({
            message: $("#welcomeMessage").html(),
            type: 'success',
            showCloseButton: true,
            hideAfter: 10
        });
    }

    if ($("#updateStatus").length && !$("#updateStatus").is(':empty')) {

        var ok = $("#updateStatus").data('ok');
        var message = $("#updateStatus").html();

        Messenger({
            extraClasses: 'messenger-fixed messenger-on-right messenger-on-top'
        }).post({
            message: message,
            type: ok ? 'success' : 'error',
            showCloseButton: true,
            hideAfter: 10
        });
    }

    /*
     * Game page
     */
    if ($("#board").length) {

        var game = new Chess();
        var pgnEl = $('#pgn');
        var token = $("#board").data('token');
        var side = $("#board").data('side');
        var opponentSide = side === "black" ? "white" : "black";

        var onDragStart = function(source, piece, position, orientation) {
            if (game.game_over() === true ||
                (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
                (game.turn() === 'b' && piece.search(/^w/) !== -1) ||
                (game.turn() !== side.charAt(0) )) {
                return false;
            }
        };

        var onDrop = function(source, target, piece, newPos, oldPos, orientation) {
            // see if the move is legal
            var move = game.move({
                from: source,
                to: target,
                promotion: 'q' // NOTE: always promote to a queen for example simplicity
            });

            // illegal move
            if (move === null) return 'snapback';
            pgnEl.html(game.pgn());
            $('.turn').removeClass("fa fa-spinner");
            $('#turn-' + game.turn()).addClass("fa fa-spinner");
            socket.emit('new-move', {
                token: token,
                source: source,
                target: target,
                piece: piece,
                newPosition: ChessBoard.objToFen(newPos),
                oldPosition: ChessBoard.objToFen(oldPos)
            });
        };

        // update the board position after the piece snap
        // for castling, en passant, pawn promotion
        var onSnapEnd = function() {
            board.position(game.fen());
        };

        var cfg = {
            draggable: true,
            position: 'start',
            moveSpeed: 'slow',
            onDragStart: onDragStart,
            onSnapEnd: onSnapEnd,
            onDrop: onDrop,
            snapbackSpeed: 500,
            snapSpeed: 150,
            orientation: side
        };
        var board = new ChessBoard('board', cfg);

        socket.emit('join', {
            'token': token,
            'side': side
        });

        socket.on('wait', function (data) {
            var url = "http:/chesshub-benas.rhcloud.com/game/" + token + "/" + opponentSide;
            $('#gameUrl').html(url);
            $('#gameUrlPopup').modal({
                keyboard: false,
                backdrop: 'static'
            });
        });

        socket.on('ready', function (data) {
            $('#turn-w').addClass("fa fa-spinner");
            $('#player-white').html(data.white);
            $('#player-black').html(data.black);
            $('#gameUrlPopup').modal('hide');
        });

        socket.on('new-move', function(data){
            game.move({ from: data.source, to: data.target });
            board.position( game.fen() );
            pgnEl.html(game.pgn());
            $('.turn').removeClass("fa fa-spinner");
            $('#turn-' + game.turn()).addClass("fa fa-spinner");
        });

        $('#resignButton').click(function (ev) {
            ev.preventDefault();
            socket.emit('resign', {
                'token': token,
                'side': side
            });
        });

        socket.on('player-resigned', function (data) {
            $('#gameResult').html(data.side + ' resigned.');
            $('#gameResultPopup').modal({
                keyboard: false,
                backdrop: 'static'
            });
        });

        socket.on('opponent-disconnected', function (data) {
            $('#gameResult').html('Your opponent has been disconnected.');
            $('#gameResultPopup').modal({
                keyboard: false,
                backdrop: 'static'
            });
        });

        socket.on('full', function (data) {
            alert("This game has been already joined by another person.");
            window.location = '/';
        });

    }

    /*
     * TV page
     */
    if ($("#trg").length) {
        var trg = new ChessBoard('trg', 'start');
        tvSocket.on('newTrgMove', function(data){
            trg.position(data.fen);
            if ($("#tv-game-details").length) {
                $("#pgn").html(data.pgn);
                $("#pgn").scrollTop($("#pgn")[0].scrollHeight);
                $('.turn').removeClass("fa fa-spinner");
                $('#turn-' + data.turn).addClass("fa fa-spinner");
            }
        });
    }

    /*
     * Monitoring page
     */
    if ($("#monitor").length) {

        var nbUsers, nbGames, totalGames;

        monitorSocket.on('update', function(data) {
            nbUsers = data.nbUsers;
            nbGames = data.nbGames;
            totalGames = nbGames; // todo: should be set from data.totalGames;
            $("#nbUsers").html(nbUsers);
            $("#nbGames").html(nbGames);
            $("#totalGames").html(totalGames);
            var chart = $('#chart').highcharts();
            chart.series[0].addPoint(nbUsers, true, true);
            chart.series[1].addPoint(nbGames, true, true);
        });

        $('#chart').highcharts({
            chart: {
                type: 'spline',
                renderTo: 'container',
                defaultSeriesType: 'spline',
                animation: Highcharts.svg, // don't animate in old IE
                marginRight: 10
            },
            title: {
                text: ''
            },
            yAxis: {
                title: {
                    text: 'Total'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            legend: {
                enabled: true
            },
            exporting: {
                enabled: false
            },
            series: [{
                name: 'active users',
                data: [0,0,0,0,0,0]
            },{
                name: 'active games',
                data: [0,0,0,0,0,0]
            }]
        });

    }

    /*
     * Search page
     */
    if ($("#searchGameForm")) {
        $( "#searchGameFormSubmit" ).on("click", function( event ) {
            alert('Not implemented in demo mode, ElasticSearch not available on Open Shift');
            /*$.ajax({
                type: "POST",
                url: "http://chesshub-benas.rhcloud.com/search",
                data: {
                    white: $( "input[name$='white']" ).val(),
                    black: $( "input[name$='black']" ).val(),
                    content: $( "input[name$='content']" ).val(),
                    result: $( "input[name$='result']" ).val()
                },
                success: function (data){
                    var games = data.games;
                    console.log(games.length);
                    $('#foundGamesTable tbody tr').remove();
                    for (var i = 0; i < games.length; i++) {
                        var game = "<tr>" +
                            "<td>" + games[i]._id + "</td>" +
                            "<td>" + games[i]._source.white + "</td>" +
                            "<td>" + games[i]._source.black + "</td>" +
                            "<td>" + games[i]._source.result + "</td>" +
                            "<td>" + "<a title='Not implemented' href='#'><i class='fa fa-eye'></i> Preview</a>" + "</td>" +
                            "</tr>";
                        $('#foundGamesTable tbody').append(game);
                    }
                    $('#totalFoundGames').html(games.length);
                    $("#searchResult").show();
                },
                error: function() {
                    alert("Error while searching games!");
                }
            });*/
            event.preventDefault();
        });
    }
});
